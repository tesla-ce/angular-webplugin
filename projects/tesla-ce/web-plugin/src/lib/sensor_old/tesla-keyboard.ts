export class TeslaKeyboard {
  private keys = [
    "1","2","3","4","5","6","7","8","9","0",
    "a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z"
  ];
  // the elements / characters to be assigned to the finite state machines
  private elements = [
    // "backspace",
    "esc","tab","space","return","scroll","capslock","numlock", "scrolllock","home","del","end","pageup","pagedown",
    "left","up","right","down", "ctr", "alt", "shift", "pausebreak", "escape", "printscreen", "insert", "delete",
    "f1","f2","f3","f4","f5","f6","f7","f8","f9","f10","f11","f12",
    "1","2","3","4","5","6","7","8","9","0",
    "a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z",

    "*", "+", "-",
    ";", "=", "," , ".", "/", "`", "[", "\\", "]", "'",

    "~", ")", "!", "@", "#", "$", "%", "^", "&", "(", "_",
    "{", "}", "|", ":", "<", ">", "?",

    "ctrl+a","ctrl+b","ctrl+c","ctrl+d","ctrl+e","ctrl+f","ctrl+g","ctrl+h","ctrl+i","ctrl+j","ctrl+k","ctrl+l","ctrl+m",
    "ctrl+n","ctrl+o","ctrl+p","ctrl+q","ctrl+r","ctrl+s","ctrl+t","ctrl+u","ctrl+v","ctrl+w","ctrl+x","ctrl+y","ctrl+z",
    "shift+a","shift+b","shift+c","shift+d","shift+e","shift+f","shift+g","shift+h","shift+i","shift+j","shift+k","shift+l",
    "shift+m","shift+n","shift+o","shift+p","shift+q","shift+r","shift+s","shift+t","shift+u","shift+v","shift+w","shift+x",
    "shift+y","shift+z",
    "alt+a","alt+b","alt+c","alt+d","alt+e","alt+f","alt+g","alt+h","alt+i","alt+j","alt+k","alt+l",
    "alt+m","alt+n","alt+o","alt+p","alt+q","alt+r","alt+s","alt+t","alt+u","alt+v","alt+w","alt+x","alt+y","alt+z",

    "ctrl+esc","ctrl+tab","ctrl+space","ctrl+return","ctrl+backspace","ctrl+scroll","ctrl+capslock","ctrl+numlock",
    "ctrl+insert","ctrl+home","ctrl+del","ctrl+end","ctrl+pageup","ctrl+pagedown","ctrl+left","ctrl+up","ctrl+right",
    "ctrl+down",
    "ctrl+f1","ctrl+f2","ctrl+f3","ctrl+f4","ctrl+f5","ctrl+f6","ctrl+f7","ctrl+f8","ctrl+f9","ctrl+f10","ctrl+f11","ctrl+f12",
    "shift+esc","shift+tab","shift+space","shift+return","shift+backspace","shift+scroll","shift+capslock","shift+numlock",
    "shift+insert","shift+home","shift+del","shift+end","shift+pageup","shift+pagedown","shift+left","shift+up",
    "shift+right","shift+down",
    "shift+f1","shift+f2","shift+f3","shift+f4","shift+f5","shift+f6","shift+f7","shift+f8","shift+f9","shift+f10","shift+f11","shift+f12",
    "alt+esc","alt+tab","alt+space","alt+return","alt+backspace","alt+scroll","alt+capslock","alt+numlock",
    "alt+insert","alt+home","alt+del","alt+end","alt+pageup","alt+pagedown","alt+left","alt+up","alt+right","alt+down",
    "alt+f1","alt+f2","alt+f3","alt+f4","alt+f5","alt+f6","alt+f7","alt+f8","alt+f9","alt+f10","alt+f11","alt+f12"
  ];

  private shiftCombos = [
    "shift+a","shift+b","shift+c","shift+d","shift+e","shift+f","shift+g","shift+h","shift+i","shift+j","shift+k","shift+l",
    "shift+m","shift+n","shift+o","shift+p","shift+q","shift+r","shift+s","shift+t","shift+u","shift+v","shift+w","shift+x",
    "shift+y","shift+z",

    "shift+esc","shift+tab","shift+space","shift+return","shift+backspace","shift+scroll","shift+capslock","shift+numlock",
    "shift+insert","shift+home","shift+del","shift+end","shift+pageup","shift+pagedown","shift+left","shift+up",
    "shift+right","shift+down", "shift+f1","shift+f2","shift+f3","shift+f4","shift+f5","shift+f6","shift+f7","shift+f8","shift+f9","shift+f10","shift+f11","shift+f12"
  ];

  private controlCombos = [
    "ctrl+a","ctrl+b","ctrl+c","ctrl+d","ctrl+e","ctrl+f","ctrl+g","ctrl+h","ctrl+i","ctrl+j","ctrl+k","ctrl+l","ctrl+m",
    "ctrl+n","ctrl+o","ctrl+p","ctrl+q","ctrl+r","ctrl+s","ctrl+t","ctrl+u","ctrl+v","ctrl+w","ctrl+x","ctrl+y","ctrl+z",
    "ctrl+esc","ctrl+tab","ctrl+space","ctrl+return","ctrl+backspace","ctrl+scroll","ctrl+capslock","ctrl+numlock",
    "ctrl+insert","ctrl+home","ctrl+del","ctrl+end","ctrl+pageup","ctrl+pagedown","ctrl+left","ctrl+up","ctrl+right",
    "ctrl+down","ctrl+f1","ctrl+f2","ctrl+f3","ctrl+f4","ctrl+f5","ctrl+f6","ctrl+f7","ctrl+f8","ctrl+f9","ctrl+f10","ctrl+f11","ctrl+f12"
  ];

  private altCombos = [
    "alt+esc","alt+tab","alt+space","alt+return","alt+backspace","alt+scroll","alt+capslock","alt+numlock",
    "alt+insert","alt+home","alt+del","alt+end","alt+pageup","alt+pagedown","alt+left","alt+up","alt+right","alt+down",
    "alt+f1","alt+f2","alt+f3","alt+f4","alt+f5","alt+f6","alt+f7","alt+f8","alt+f9","alt+f10","alt+f11","alt+f12",
    "alt+a","alt+b","alt+c","alt+d","alt+e","alt+f","alt+g","alt+h","alt+i","alt+j","alt+k","alt+l",
    "alt+m","alt+n","alt+o","alt+p","alt+q","alt+r","alt+s","alt+t","alt+u","alt+v","alt+w","alt+x","alt+y","alt+z"
  ];

  private otherKeys = [
    "esc","tab","return","backspace","scroll","capslock","numlock","insert","home","del","end","pageup","pagedown",
    "left","up","right","down", "f1","f2","f3","f4","f5","f6","f7","f8","f9","f10","f11","f12"
  ];

  private keyCodeMap = {
    8:"backspace", 9:"tab", 13:"return", 16:"shift", 17:"ctrl", 18:"alt", 19:"pausebreak", 20:"capslock", 27:"escape", 32:"space", 33:"pageup",
    34:"pagedown", 35:"end", 36:"home", 37:"left", 38:"up", 39:"right", 40:"down", 43:"+", 44:"printscreen", 45:"insert", 46:"delete",
    48:"0", 49:"1", 50:"2", 51:"3", 52:"4", 53:"5", 54:"6", 55:"7", 56:"8", 57:"9", 59:";",
    61:"=", 65:"a", 66:"b", 67:"c", 68:"d", 69:"e", 70:"f", 71:"g", 72:"h", 73:"i", 74:"j", 75:"k", 76:"l",
    77:"m", 78:"n", 79:"o", 80:"p", 81:"q", 82:"r", 83:"s", 84:"t", 85:"u", 86:"v", 87:"w", 88:"x", 89:"y", 90:"z",
    96:"0", 97:"1", 98:"2", 99:"3", 100:"4", 101:"5", 102:"6", 103:"7", 104:"8", 105:"9",
    106: "*", 107:"+", 109:"-", 110:".", 111: "/",
    112:"f1", 113:"f2", 114:"f3", 115:"f4", 116:"f5", 117:"f6", 118:"f7", 119:"f8", 120:"f9", 121:"f10", 122:"f11", 123:"f12",
    144:"numlock", 145:"scrolllock", 186:";", 187:"=", 188:",", 189:"-", 190:".", 191:"/", 192:"`", 219:"[", 220:"\\", 221:"]", 222:"'"
  };

  private modifiedByShift  = {
    192:"~", 48:")", 16:"shift", 49:"!", 50:"@", 51:"#", 52:"$", 53:"%", 54:"^", 55:"&", 56:"*", 57:"(", 109:"_", 61:"+",
    219:"{", 221:"}", 220:"|", 59:":", 222:"\"", 188:"<", 189:">", 191:"?",
    96:"insert", 97:"end", 98:"down", 99:"pagedown", 100:"left", 102:"right", 103:"home", 104:"up", 105:"pageup"
  };

  // function to get a character (char) of a given keycode (number)
  public getCharacter = function(keyCode, isModifiedByShift){
    if (isModifiedByShift){
      if(this.modifiedByShift[keyCode]){
        return this.modifiedByShift[keyCode];
      }
      else {
        if (this.keyCodeMap[keyCode]) {
          var toUpper = this.keyCodeMap[keyCode].toUpperCase();
          return toUpper;
        } else {
          return ' ';
        }
      }
    }
    else{
      if (this.keyCodeMap[keyCode]) {
        return this.keyCodeMap[keyCode];
      } else {
        return ' ';
      }
    }
  };

  // the list/map of valid keys
  // this is used on the feature extraction phase to filter the valid keys before extracting the features
  private validKeys = {
    "a" : true,
    "b" : true,
    "c" : true,
    "d" : true,
    "e" : true,
    "f" : true,
    "g" : true,
    "h" : true,
    "i" : true,
    "j" : true,
    "k" : true,
    "l" : true,
    "m" : true,
    "n" : true,
    "o" : true,
    "p" : true,
    "q" : true,
    "r" : true,
    "s" : true,
    "t" : true,
    "u" : true,
    "v" : true,
    "w" : true,
    "x" : true,
    "y" : true,
    "z" : true,
    "0" : true,
    "1" : true,
    "2" : true,
    "3" : true,
    "4" : true,
    "5" : true,
    "6" : true,
    "7" : true,
    "8" : true,
    "9" : true,
    "space" : true,
    "alt" : true,
    "ctrl" : true,
    "shift" : true,
    "," : true,
    "." : true
  };

  // check if character keys is a valid one
  public isValidKey = function(key) {
    return this.validKeys[key];
  };
}
