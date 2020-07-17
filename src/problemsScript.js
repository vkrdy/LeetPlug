console.log('Problems page intercepted');
window.addEventListener("load", onLoadPage, false);

// Configuration consts
var problemDescriptionElement = "[data-key='description-content']";
var submissionResultElement = "[class*='result__']";
var submissionSuccessElement = "[class*='success__']";
var submissionErrorElement = "[class*='error__']";
var codeAreaElement = "[data-cy='code-area']";
var codingPanelElement = "[class*='content__']";
var runCodeButton = "[data-cy='run-code-btn']";
var submitCodeButton = "[data-cy='submit-code-btn']";
var resetCodeButton = "[class*='reset-code-btn__']";
var resetCodeButtonWarn = "[class*='reset-code-btn-warn__']";

var customControlButtons = `
<div id='controlButtons'>
<p id="controlButtonsTitle" class="title_style">LeetPlug mask</p>
<p id="controlButtonsText" class="text_style">Choose how to start the problem:</p>
<p id="showProblemWithTimer" class="round_style">Show the problem with time tracking</p>
<p id="showProblemNoTimer" class="round_style">Show the problem without time tracking</p>
</div>
`

// Styles definition
var timerStyle = `
.timer_style {
    border-radius: 2px;
    border:1px solid #E8E8E8;
    background-color: #FAFAFA;
    color: black;
    font-weight: bold;
    padding: 5px;
    margin-right: 10px;
}
.title_style {
    margin: 10;
    text-align: center;
    font-color: #FAFAFA;
    font-weight: bold;
    font-size: 150%;
}
.text_style {
    margin: 10;
    text-align: center;
    font-color: #FAFAFA;
}
.round_style {
    margin: 10;
    text-align: center;
    font-weight: bold;
    border-radius: 2px;
    border:1px solid #E8E8E8;
    background: #FAFAFA;
    padding: 20px; 
    width: 100%;
    height: auto;
}
.round_style:hover {
    background: #FFFFFF;
}

#controlButtons {
    margin: auto;
}
`
// Globals
var sec = 0;
var userId = "";
var userKey = "";
var pageURL = window.location.href;
var currentProblem = getProblem();
var session = Date.now();
var webAppURL = "";
var webAppBasic = "";
var jsSubmissionChecktimer;

// Sync from chrome storage
chrome.storage.sync.get(['userId', 'userKey', 'webAppURL', 'webAppBasic'], function(result) {
    if (!(typeof result.userId === 'undefined'))
        userId = result.userId;
    if (!(typeof result.userKey === 'undefined'))
        userKey = result.userKey;
    if (!(typeof result.webAppURL === 'undefined'))
        webAppURL = result.webAppURL;
    if (!(typeof result.webAppBasic === 'undefined'))
        webAppBasic = result.webAppBasic;
});

// JQuery helper to check for an attribute existence
$.fn.hasAttribute = function(name) {
    return this.attr(name) !== undefined;
}

// Timer functions
function pad ( val ) {
    return val > 9 ? val : "0" + val;
}
function updateTimer() {
    ++sec;
    $("#timer").html(pad(parseInt(sec/60,10)) + " Minutes " + pad(sec%60) + " Seconds");
}
function startTimer() {
    var updateTimerInterval = setInterval (updateTimer, 1000);
}
function hideTimer() {
    $("#timer").attr("style", "display: none;");
}

// Show original hidden elements
function showAll() {
    $("#controlButtonsTitle").attr("style", "display: none;");
    $("#controlButtonsText").attr("style", "display: none;");
    $("#showProblemWithTimer").attr("style", "display: none;");
    $("#showProblemNoTimer").attr("style", "display: none;");
    $(problemDescriptionElement).attr("style", "display: visible;");
    $(codeAreaElement).children(codingPanelElement).attr("style", "visibility: visible;");
}

// Send the event related to the problem (start, submit) to the remote web service
function sendProblemEvent(problem, event, session) {
    console.log('Info: ' + userId + " " + userKey);
    if (userId == "" || userKey == "") return;

    const req = new XMLHttpRequest();
    let url = new URL(webAppURL + '/events');
    var formData = new FormData();
    formData.append('id', userId);
    formData.append('key', userKey);
    formData.append('problem', problem);
    formData.append('event', event);
    formData.append('session', session);
    console.log('Sending message to: ' + url);

    req.open("POST", url, true)
    req.setRequestHeader('Authorization', webAppBasic);
    req.send(formData);
}

// Get the problem identifier from token of the URL
function getProblem() {
    var tokens = pageURL.split("/");

    if (tokens.length >= 2 && tokens[tokens.length - 2] != 'submissions' && tokens[tokens.length - 2] != 'solution')
        return tokens[tokens.length - 2];
    else if (tokens.length >= 3 && tokens[tokens.length - 3] != 'submissions' && tokens[tokens.length - 3] != 'solution')
        return tokens[tokens.length - 3];

    return "NA"
}

// Main onLoadPage function, starts the cycles needed to discover the elements inside the page
// and to attach listeners to them
function onLoadPage (evt) {
    var problemDescriptionFound = false;
    var codingPanelFound = false;
    // insert the styles for the custom components
    var styleSheet = document.createElement("style")
    styleSheet.type = "text/css"
    styleSheet.innerText = timerStyle
    document.head.appendChild(styleSheet)

    // This function can identify if the submit was completed and stop the polling cycle
    function checkForSubmitComplete () {
        $(submissionSuccessElement).each(function( index ) {
            if ($(this).parent('[class*=result__]').length) {
                clearInterval(jsSubmissionChecktimer);
                console.log("SUCCESS");
                sendProblemEvent(currentProblem, "result_ok", session);
            }
        });
        $(submissionErrorElement).each(function( index ) {
            if ($(this).parent('[class*=result__]').length) {
                clearInterval(jsSubmissionChecktimer);
                console.log("ERROR");
                sendProblemEvent(currentProblem, "result_ko", session);
            }
        });
    }

    // this function will be called in a loop to wait for dynamic elements creation
    function checkForJSLoadComplete () {
        // check if the problem description element has been created
        if ($(problemDescriptionElement).length && !problemDescriptionFound) {
            console.log('Problem description found');
            // hide the problem description
            // used "display" to free up the space and put the button instead
            $(problemDescriptionElement).attr("style", "display: none;");
            $(customControlButtons).insertBefore($(problemDescriptionElement))

            // set the callbacks on click on button
            $("#showProblemWithTimer").click(function(e) {
                // if the coding panel is not clean
                if ($(resetCodeButton)[0] !== undefined) {
                    // trigger the reset of the code
                    $(resetCodeButton)[0].click();
                } else if ($(resetCodeButtonWarn)[1] !== undefined) {
                    // trigger the reset of the code
                    $(resetCodeButtonWarn)[1].click();
                } else {
                    showAll();
                    startTimer();
                    sendProblemEvent(currentProblem, "start", session);
                }
            });
            $("#showProblemNoTimer").click(function(e) {
                showAll();
                hideTimer();
                sendProblemEvent(currentProblem, "start", session);
            });

            problemDescriptionFound = true;
        }
        // check if the coding panel has been created
        if ($(codeAreaElement).length &&
            $(codeAreaElement).children(codingPanelElement).length &&
            !codingPanelFound) {
            console.log('Problem coding frame found');
            // hide the coding panel
            // use "visibility" to keep the space in the layout
            $(codeAreaElement).children(codingPanelElement).attr("style", "visibility: hidden;");

            // add the timer near the submission buttons
            $('<label id="timer" class="timer_style">00 Minutes 00 Seconds</label>').insertBefore($(runCodeButton))

            $(submitCodeButton).click(function(e) {
                console.log("SUBMIT");

                jsSubmissionChecktimer = setInterval(checkForSubmitComplete, 200);
            });

            codingPanelFound = true;
        }
        // check if all the required elements have been found
        if (problemDescriptionFound && codingPanelFound) {
            console.log('Found all the required elements. Disabling polling timer');
            // disable the loop which checks the page content
            clearInterval(jsInitChecktimer);
        }
    }

    // start the polling loop to check when the dynamics components are created
    var jsInitChecktimer = setInterval(checkForJSLoadComplete, 200);
}
