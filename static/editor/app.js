import "../libs/quill.js"
import "../libs/jquery.min.js"
import "/global.js"

var sectionNames = ["MainText", "SideSections", "Settings"]

var selectedTab = 0;
var lastTab = 0;

const urlParams = new URLSearchParams(window.location.search);

const SEPERATOR = "%*%-%"


function setTabHtml(x) {
    if (lastTab != 2) {
        WaitForQuill().then((quill) => {
            if (lastTab == 2) return;
            let contents = JSON.stringify(quill.getContents())
            sessionStorage.setItem(sectionNames[lastTab], contents);
        })
    } else {
        let contents = $("#articleName").val()
        contents += SEPERATOR
        let imageSelectorButton;
        (window.waitForElm(".image-selector-button")).then(() => {
            imageSelectorButton = $(".image-selector-button")
            let parts = (imageSelectorButton.css("background-image").replace(/^url\(["']?(.*?)["']?\)$/, '$1')
            .split("/"))
            contents += ("/" + parts[parts.length - 2] + "/" + parts[parts.length - 1])
            sessionStorage.setItem(sectionNames[2], contents);
        })
    }
    $.get(`/temps/${x}.html`, function (data) {
        $("#container").html(data);
        if (selectedTab != 2) {
            WaitForQuill().then((x) => {
                let contents = sessionStorage.getItem(sectionNames[selectedTab])
                x.setContents(JSON.parse(contents))
            })
        } else {
            let contents = sessionStorage.getItem(sectionNames[selectedTab])
            if (contents !== null) {
                let articleName, image;
                [articleName, image] = contents.split(SEPERATOR)
                $("#articleName").val(articleName)
                let imageSelectorButton;
                (window.waitForElm(".image-selector-button")).then(() => {
                    imageSelectorButton = $(".image-selector-button")
                    imageSelectorButton.css("background-image", `url('${image}')`)
                })
            }

        }
    });
}

function saveArticle() {
    let MainText = sessionStorage.getItem("MainText") ?? ""
    let SideText = sessionStorage.getItem("SideSections") ?? ""
    let image = sessionStorage.getItem("Settings") !== null ? (sessionStorage.getItem("Settings")).split(SEPERATOR)[1] :
        "/resources/default.svg"
    let ArticleName = (sessionStorage.getItem("Settings") ?? SEPERATOR).split(SEPERATOR)[0]
    let description = $("#article-description").val() ?? ""

    if (selectedTab == 0) {
        let contents = JSON.stringify(quill.getContents())
        MainText = contents
    } else if (selectedTab == 1) {
        let contents = JSON.stringify(quill.getContents())
        SideText = contents
    } else {
        let contents = $("#articleName").val()
        contents += SEPERATOR
        let imageSelectorButton;
        (window.waitForElm(".image-selector-button")).then(() => {
            imageSelectorButton = $(".image-selector-button")
            let parts = (imageSelectorButton.css("background-image").replace(/^url\(["']?(.*?)["']?\)$/, '$1')
                .split("/"))
                contents += ("/" + parts[parts.length - 2] + "/" + parts[parts.length - 1])
                image = contents.split(SEPERATOR)[1]
                ArticleName = contents.split(SEPERATOR)[0]
        })
    }
    let lastArticle = sessionStorage.getItem("Article") == "" || sessionStorage.getItem("Article") === null ?
        undefined :
        sessionStorage.getItem("Article");
    ArticleName = ArticleName == "" ? "Article" : ArticleName
    if (sessionStorage.getItem("Article") == "" || sessionStorage.getItem("Article") === null) {
        retrieveArticle(localStorage.getItem("CurrentProject"), ArticleName).then(() => {
            window.showToast("Article with the same name exists", "danger", 3000)
        }).catch(() => {
            articleRequest(localStorage.getItem("CurrentProject"), ArticleName, MainText, SideText, image,
                description, lastArticle)
            window.showToast("Successfuly saved article", "success", 3000)
            sessionStorage.setItem("Article", ArticleName)
            setCurrentArticle()
        })
    } else {
        articleRequest(localStorage.getItem("CurrentProject"), ArticleName, MainText, SideText, image, description,
            lastArticle)
        window.showToast("Successfuly saved article", "success", 3000)
        sessionStorage.setItem("Article", ArticleName)
        setCurrentArticle()
    }



}

function articleRequest(project, name, mainText, sideText, image, description, replaceArticle) {
    const apiCall = new XMLHttpRequest();
    apiCall.open('POST', '/api/createArticle', true);
    apiCall.setRequestHeader('Content-Type', 'application/json');
    apiCall.onload = function () {
        if (apiCall.status === 200) {
            console.log(apiCall.responseText);
        } else {
            console.error('Article save failed. Returned status of ' + apiCall.status);
        }
    };

    const data = {
        Project: project,
        Name: name,
        MainText: mainText,
        SideText: sideText,
        Image: image,
        Description: description
    };

    if (typeof replaceArticle !== "undefined") {
        data.ReplaceArticle = replaceArticle
    }
    apiCall.send(JSON.stringify(data))
}


const changeTab = (x) => {
    switch (x) {
        case "MainText":
            setTabHtml(x);
            break;
        case "SideSections":
            setTabHtml(x);
            break;
        case "Settings":
            setTabHtml(x)
            break;
        default:
            break;
    }
}

function retrieveArticle(project, name) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', `/api/retrieveArticle?Project=${project}&Name=${name}`, true);

        xhr.onload = () => {
            if (xhr.status === 200) {
                if (xhr.responseText.startsWith("Fail")) {
                    reject
                }
                const response = (xhr.responseText);
                if (typeof response === 'string' && response.startsWith('Fail:')) {
                    reject(new Error(response));
                } else {
                    resolve(JSON.parse(response));
                }
            } else {
                reject(new Error(`Fail: Returned status of ${xhr.status}`));
            }
        };

        xhr.onerror = () => {
            reject(new Error('Fail: '));
        };

        xhr.send();
    });
}


function setCurrentArticle() {
    if (sessionStorage.getItem("Article") !== "") {
        retrieveArticle(localStorage.getItem("CurrentProject"), sessionStorage.getItem("Article")).then(x => {
            if (typeof x["MainText"] !== 'undefined') sessionStorage.setItem("MainText", x["MainText"])
            if (typeof x["image"] !== 'undefined') sessionStorage.setItem("Settings", x["Name"] + SEPERATOR + x[
                "image"])
            if (typeof x["SideText"] !== 'undefined') sessionStorage.setItem("SideSections", x["SideText"])
            if (typeof x["Description"] !== 'undefined') sessionStorage.setItem("description", x["Description"])
            $(".article-image").attr("src", (sessionStorage.getItem("Settings") ?? SEPERATOR +
                '/resources/default.svg').split(SEPERATOR)[1])
            $("#article-description").val(sessionStorage.getItem("description") ?? "")
            $(".article-title").html(x["Name"])
            
            console.log(x)
        })
    }
}

var sections = document.getElementsByClassName("topbar-section")

for (let i = 0; i < sections.length; i++) {
    sections[i].addEventListener("click", () => {
        sections[selectedTab].removeAttribute("selected");
        sections[i].setAttribute("selected", "");
        lastTab = selectedTab;
        selectedTab = i;
        changeTab(sectionNames[i])
    })
}

//initalization

if (urlParams.get("new") !== null) {
    $(".topbar-section:eq(2)").click()
} else {
    setCurrentArticle()
    changeTab("MainText")
}


async function WaitForQuill() {
    while (typeof quill === 'undefined') {
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    return quill;
}

let articleTitle = document.querySelector(".article-title")
if (articleTitle.scrollWidth > articleTitle.clientWidth) {
    articleTitle.parentElement.setAttribute("class", "article-title-container tooltip-target");
    articleTitle.parentElement.innerHTML += ` 
                <div class="tooltip">
                    <div class="tooltip-text">${articleTitle.innerHTML}</div>
                </div>
    `
}


window.saveArticle = saveArticle;
window.c = () => {
    //debug function
    return (selectedTab)
}