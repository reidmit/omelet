var input, output;
var fileNameInput;
var sidebarShown = false;
var currentFileName = "";
var fileStoragePrefix = "__TOAST__IDE__file__:";
var fileStorageCurrent = "__TOAST__IDE__latest__";


function update() {
    var unprocessed = input.value;
    var processed = render(input.value);
    output.value = processed;
    saveFile(currentFileName);
}

function toggleSidebar() {
  getFileList();
  var inWindow = document.getElementById("input");
  var outWindow = document.getElementById("output");
  var sidebar = document.getElementById("sidebar");
  var btn = document.getElementById("menu-btn");
  if (!sidebarShown) {
    sidebar.style.left = "0px";
    inWindow.style.left = "200px";
    inWindow.style.right = "calc(50% - 100px)";
    outWindow.style.left = "calc(50% + 100px)";
    btn.style.background = "#fff";
    btn.style.color = "rgb(47,87,92)";
    btn.innerHTML = "<i class='fa fa-folder-open' aria-hidden='true'></i>";
    btn.paddingLeft = "6px";
    sidebarShown = true;
  } else {
    sidebar.style.left = "-200px";
    inWindow.style.left = "0px";
    inWindow.style.right = "50%";
    outWindow.style.left = "50%";
    btn.style.background = "";
    btn.style.color = "";
    btn.innerHTML = "<i class='fa fa-folder' aria-hidden='true'></i>";
    btn.paddingLeft = "";
    sidebarShown = false;
  }
}

function loadFile(fileName) {
  saveFile(currentFileName);
  var storedFile = localStorage.getItem(fileStoragePrefix+fileName);
  if (storedFile === null) {
    //error case, should never really happen
    currentFileName = "";
  } else {
    currentFileName = fileName;
    getFileList();
    input.value = storedFile;
    update();
  }
  fileNameInput.value = currentFileName;
}

function saveFile(fileName) {
  if (fileName === "") return;
  var text = input.value;
  console.log("setting "+fileName+" to: "+text);
  localStorage.setItem(fileStoragePrefix+fileName, text);
  localStorage.setItem(fileStorageCurrent,fileName);
}

function deleteCurrentFile() {
  if (currentFileName === "") return;
  var res = confirm("Are you sure you want to delete the file '"+currentFileName+"'?");
  if (res) {
    localStorage.removeItem(fileStoragePrefix+currentFileName);
    currentFileName = "";
    getFileList();
    newFile();
  }
}

function newFile() {
  saveFile(currentFileName);
  input.value = "";
  output.value = "";
  currentFileName = "";
  fileNameInput.value = "";
  fileNameInput.focus();
}

function getFileList() {
  var sidebar = document.getElementById("sidebar");
  var list = [];
  for (var i=0; i<localStorage.length; i++) {
    var key = localStorage.key(i);
    if (key.indexOf(fileStoragePrefix) === 0) {
      var file = key.replace(fileStoragePrefix,"");
      var c = file == currentFileName ? " active" : "";
      var elt = "<span class='file-list-item"+c+"' onclick='loadFile(\""+file+"\");'>"+file+"</a>";
      list.push(elt);
    }
  }
  sidebar.innerHTML = "<ul><li>"+list.join("</li><li>")+"</li></ul>";
}

function checkForFileNameChange() {
  var fileNameInput = document.getElementById("filename");
  if (currentFileName === "") {
    currentFileName = fileNameInput.value;
    saveFile(currentFileName);
    getFileList();
  } else if (currentFileName !== fileNameInput.value){
    var res = confirm("Are you sure you want to rename "+currentFileName
                +" to "+fileNameInput.value+"?");
    if (res) {
      deleteCurrentFile();
      currentFileName = fileNameInput.value;
      saveFile(currentFileName);
      getFileList();
    } else {
      fileNameInput.value = currentFileName;
      return;
    }
  }
}

function updateToastSettings() {
    var sourceLangSelect = document.getElementById("sourceLanguage");
    var targetLangSelect = document.getElementById("targetLanguage");
    sourceLanguage = sourceLangSelect.value;
    targetLanguage = targetLangSelect.value;
    T = new module.exports.ToastInstance({
        sourceLanguage: sourceLanguage,
        targetLanguage: targetLanguage,
        prettyPrint: true,
        isWeb: true
    });
    update();
}

window.onload = function() {
  fileNameInput = document.getElementById("filename");
  input = document.getElementById("input");
  output = document.getElementById("output");

  getFileList();

  var storedCurrent = localStorage.getItem(fileStorageCurrent);
  if (storedCurrent === null) {
    currentFileName = "";
  } else {

    var storedFile = localStorage.getItem(fileStoragePrefix+storedCurrent);
    if (storedFile === null) {
      //error case, should never really happen
      currentFileName = "";
    } else {
      currentFileName = storedCurrent;
      input.value = storedFile;
      update();
    }
    fileNameInput.value = currentFileName;
  }

  input.onkeydown = function(e){
    if(e.keyCode==9 || e.which==9){
      e.preventDefault();
      var s = this.selectionStart;
      this.value = this.value.substring(0,this.selectionStart) + "  " + this.value.substring(this.selectionEnd);
      this.selectionEnd = s+2;
    }
  }
}
