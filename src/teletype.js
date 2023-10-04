// Updates by JGH, Apr-2021
//  CHR$127 ignored, CHR$8 backspace, CHR$9 TABs expand option
//  single-spaced lines, >CHR$96 forced to upper case, CHR$96=UKP
//  CHR$95 prints underline using half-spaced hyphen, CHR$12 formfeeds
//  BS, TAB, ESC, Ctrl-Letter return keypresses
//  BUGS: Firefox: prevents Ctrl-N, Ctrl-T, Ctrl-W, impossible to prevent this
//        Chrome: almost all CHR$<32 intercepted by browser, including ESC and BS
//        SeaMonkey: returns all control characters

"use strict";
var typingSpeed = 50; // 10cs
const bell_width = 72 - 5;
const max_width = 72 - 1;
const tab_width = 8;
const xpx = 12; // characters width/heigth
const ypx = 18; // was 30
const char_height = 20;
const margin_top = 40;
const margin_left = 90;
const max_brokenness = 99;
const max_ink_level = 600;

var pageScrollSpeed = 200;
var x = 0 * xpx;
var y = ypx;
var maxY = y;
var minY = y;
var vmid = $(window).height() / 2;
var hmid = $(window).width() / 2;
var voffset = {};
var brokenness = 15;
var ink_remaining = 280;
var ink_variation = 0.3;
var keydown_keys = {};
var keypress_keys = {};
var keydown_keycode = false;
var started = true;
var shift_lock = false;
var spoolPosition = 1;

var headImage = "head.png";

var printBuffer = [];

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function start() {
    $('.buttons, .output, .cursor').show();
    started = true;
}

function stop() {
    $('.buttons, .output, .cursor').hide();
    started = false;
}

function crlf() {
    var line_length = x / xpx;
    y += ypx;
    maxY = Math.max(maxY, y);
    x = 0;
}

function advance_one_space() {
    if ((x / xpx) < max_width) {
        x += xpx;
    }
}

function keypress(e) {

    var charCode = e.charCode;

    // Prevent browser special key actions as long as alt/cmd is not being held
    if (!e.altKey && !e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
    }

    if (e.ctrlKey) {
        if ((charCode & 64) == 64) charCode = charCode & 31;
        if (charCode == 39) charCode = 0;
        if (charCode == 54) charCode = 30;
        if (charCode == 45) charCode = 31;
    }

    // Don't handle keys that are handled by keydown functions
    if (charCode == 0) {
        // Note the use of keyCode here so these numbers will match the keydown ones
        switch (e.keyCode) {
            case 8:
            case 9:
            case 13:
            case 27:
                charCode=e.keyCode; break;
            otherwise:
                return false;
        }
    }

    // Record the keypress for mutex purposes, even if we're not going to act on it
    if (charCode != 27) {
        keypress_keys[keydown_keycode] = 1; // Have to use charCode as that's the only one available to both keypress and keyup
    }

    // Only one printing keypress allowed at a time
    if (Object.keys(keypress_keys).length > 1) {
        return false;
    }

//    if ((charCode != 10) && (charCode != 13)) {
        addchar(charCode);
//        specialchar(charCode);
//    }
}

function typeCharacter(charCode, shiftKey) {
    // just adds a character to the print buffer
    printBuffer.unshift(charCode);
}

function printer() {
    setTimeout(function() {
        var delay = typingSpeed;
        if (printBuffer.length > 0) {
            var code = printBuffer.pop();
            typeCharacterImmediately(code);
        }
        setTimeout(printer, delay);
    }, typingSpeed);
}

function typeCharacterImmediately(charCode, shiftKey) {
    var nosound = false;

    if (charCode == 127) charCode=8;
    if (charCode == 13)  x = 0;
    if (charCode == 9)   charCode=32; // Don't expand TABs, comment out to expand
    if (charCode == 8)   if (x > 0) x -= xpx;
    if (charCode == 0)   return; // ignore
    if (charCode == 10) {
        crlf();
        move_page();
    }
//    if (charCode == 12) {
//        crlf(); move_page();
//        crlf(); move_page();
//        crlf(); move_page();
//        crlf(); move_page();
//    }

    if (charCode != 32 && charCode != 127 && !((charCode === 10) || (charCode === 13)))
        $("#cursorImage").attr("src", "head2.png");

    var c;
    if (charCode > 96) charCode = charCode & 95;
    c = String.fromCharCode(charCode);

    // Vertical offset
    if (!(c in voffset)) {
        voffset[c] = {
            threshold: Math.floor(Math.random() * 99) + 1, // 1..99
            direction: Math.floor(Math.random() * 3) - 1, // -1..+1
        }
    }

    let this_voffset = (voffset[c].threshold <= brokenness) ? Math.round(voffset[c].direction * brokenness / 33) : 0;
    if (charCode == 95) {
        this_voffset += ypx/2;
        c = "-";
    }
//    output_character(c, this_voffset, '.output');

    if (charCode > 31) {
        output_character(c, this_voffset, '.output');
        advance_one_space();
    }
    if (charCode == 9) { // Expand TABs
        advance_one_space();
        while (((x/xpx) & 7) && ((x / xpx) < max_width)) {
        advance_one_space();
        }
    }

    if (c.match(/\S/)) {
        ink_remaining = ink_remaining - 0.02;
    }

    if ((x / xpx) == bell_width) {
        $.ionSound.play('bell');
    } else if (!nosound) {
        switch (charCode) {
            case 8:
            case 9:
            case 10:
            case 32:
            case 127:
                $.ionSound.play('type-space');
                break;
            default:
                $.ionSound.play('type-char');
        }
    }

    setCursorPosition();

    setTimeout(function() {
        if (charCode > 32 || charCode == 8) {
            switch (spoolPosition) {
                case 1:
                    headImage = "head.png";
                    break;
                case 2:
                    headImage = "head3.png";
                    break;
                default:
                    headImage = "head4.png";
            }
            spoolPosition = ((spoolPosition) % 3) + 1;
        }

        $("#cursorImage").attr("src", headImage);
    }, typingSpeed);
}

function output_character(aCharacter, this_voffset, where) {
    let c = aCharacter;
    // Choose an alpha level with a random element to simulate uneven key pressure and ribbon ink
    var ink_level = (ink_remaining > 0) ? ink_remaining / 400 - ink_variation + Math.random() * ink_variation : 0;

    var hpos = 'left: ' + (x + margin_left) + 'px; ';
    var vpos = 'top: ' + (y + this_voffset + margin_top) + 'px; ';

    var black_height = ypx;
    var black_height_style = '';
    var base_colour = '0,0,0';

    if (black_height > 0) {
        // Output the (possibly partial) character in black
        $(where).append('<div style="position: absolute; ' + vpos + hpos + ' color: rgba(' + base_colour + ', ' + ink_level + '); ' + black_height_style + '">' + c + '</div>');

        // Maybe output further subcropped character(s) in black to make the colouring more uneven
        for (var subclips = 0; subclips < 3; subclips++) {
            var subclip_right = Math.floor(Math.random() * xpx) + 1;
            var subclip_left = Math.floor(Math.random() * subclip_right);
            var subclip_bottom = Math.floor(Math.random() * black_height) + 1;
            var subclip_top = Math.floor(Math.random() * subclip_bottom);
            var r = Math.random();
            var sign = Math.random() < 0.5 ? -1 : 1;
            var b = brokenness / (max_brokenness + 1); // max_brokenness is 99, but let's use a percentage
            var i = ink_remaining / max_ink_level;
            // Thanks to John Valentine for help with the following formula
            var subclip_opacity = i * (0.5 + 0.5 * Math.sqrt(r * b) * sign);
            var subclip_color = 'color: rgba(' + base_colour + ', ' + subclip_opacity + '); ';
            var subclip_clip = 'clip: rect(' + subclip_top + 'px, ' + subclip_right + 'px, ' + subclip_bottom + 'px, ' + subclip_left + 'px); ';
            $(where).append('<div style="position: absolute; ' + vpos + hpos + subclip_color + subclip_clip + '">' + c + '</div>');
        }
    }
}

function keydown_nonmod(e) {
    keydown_keycode = e.keyCode;

    // Always record the keydown for mutex purposes, even if we aren't going to act on it
    keydown_keys[e.keyCode] = 1;
    if (Object.keys(keydown_keys).length > 1) {
        return false;
    }
    switch (e.which) {
        case 9: // tab
// odd, why no semicolons?
            if (e.charCode == 0) {
                e.preventDefault();
                e.preventDefault()
                specialchar(9)
            }
            break;
//        case 13: // enter
//            addchar(13);
//            specialchar(13);
//            break;
        case 46: // del
            if (e.charCode == 0) {
                e.preventDefault();
                specialchar(46);
                printBuffer = [];
            }
            //addchar(46);
            //specialchar(127);
            break;
        default: // all other characters are handled by the keypress handler
    }
}


function keydown(e) {
    if (!started) {
        start();
    }

    // If this key is already being held down, ignore it (keyboard auto-repeat may fire multiple events)
    if (keydown_keys[e.keyCode]) {
        return;
    }
    switch (e.which) {
        case 27: // esc  - ignore
        case 17: // ctrl - ignore
        case 224: // cmd  - ignore
            break;
        default:
            keydown_nonmod(e);
    }
    return;
}

function move_page() {
    $('#Carriage').attr('height', '+=' + ypx + 'px');
    $(function() {
        $('#Carriage').animate({
            top: (vmid - y) + 'px',
        }, {
            duration: pageScrollSpeed,
            queue: false
        });

        $('.output').animate({
            height: '+=' + ypx + 'px',
        }, {
            duration: pageScrollSpeed,
            queue: false
        });

        $('.cursor').animate({
            top: (y + 10) + 'px',
        }, {
            duration: pageScrollSpeed,
            queue: false
        });
    });
}

// Handler for keyup events
function keyup(e) {
    if (Object.keys(keydown_keys).length) {

        delete keydown_keys[e.keyCode];
        delete keypress_keys[e.keyCode];
    }
}

function setCursorPosition() {
    $(function() {
        $('.cursor').animate({
            left: (x - 185) + 'px',
        }, {
            duration: typingSpeed,
            queue: false
        });
    });
}

// onLoad setup
$(function() {
    move_page();
    setCursorPosition();
    $.ionSound({
        path: "",
        sounds: [{
                name: 'type-char'
            },
            {
                name: 'type-space'
            },
            {
                name: 'bell'
            },
        ],
        multiplay: true,
        preload: true,
    });

    $(document)
        .on('keydown', function(e) {
            keydown(e);
        })
        .on('keypress', function(e) {
            keypress(e);
        })
        .on('keyup', function(e) {
            keyup(e);
        });

    $(document).ready(function() {
        $('#Carriage').bind('wheel', function(e) {
			var delta = event.deltaY;
			if (event.deltaMode === 1)
				delta *= char_height;
			else if (event.deltaMode === 2)
				delta *= char_height * 20;
			
            y = Math.min(maxY, y - delta);
            y = Math.max(minY, y);
            $(function() {
                $('#Carriage').animate({
                    top: (vmid - y) + 'px',
                }, {
                    duration: pageScrollSpeed,
                    queue: false
                });
                $('.cursor').animate({
                    top: (y + 10) + 'px',
                }, {
                    duration: pageScrollSpeed,
                    queue: false
                });
            });
        });
    });
});