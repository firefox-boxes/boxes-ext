//// Setup

let formIsSetup = false;

function setupForm() {
    if (!formIsSetup) {
        function resetForm() {
            document.getElementById("add-btn").style.display = "";
            document.getElementById("add-form").style.display = "none";
            document.getElementById("new-box-name").value = "";
            document.getElementById("new-box-exec").selectedIndex = 0;
        }
    
        document.getElementById("add-btn").addEventListener("click", e => {
            document.getElementById("add-btn").style.display = "none";
            document.getElementById("add-form").style.display = "";
        });
    
        document.getElementById("new-box-cancel-btn").addEventListener("click", resetForm);
    
        browser.runtime.sendMessage({
            type: "i:ls"
        }).then(installations => {
            let optionsContainer = document.getElementById("new-box-exec");
            removeFittingElements(optionsContainer, "option:not(.freeze)");
            for (let installation of installations) {
                let o = document.createElement("option");
                o.value = installation;
                o.innerText = installation;
                optionsContainer.appendChild(o);
            }
        });
    
        const ICONS = ["backpack.svg", "beach.svg", "cap.svg", "crescent-moon.svg", "work.svg"];
        let iconPicker = document.getElementById("icon-picker");
        removeFittingElements(iconPicker, "img");
        for (let icon of ICONS) {
            let iconItem = document.createElement("img");
            iconItem.classList.add("icon-picker-item");
            iconItem.src = "./icons/" + icon;
            iconItem.setAttribute("name", icon);
            iconItem.addEventListener("click", e => {
                if (!iconItem.hasAttribute("selected")) {
                    let last = iconPicker.querySelector(".icon-picker-item[selected]");
                    if (last !== null) last.removeAttribute("selected");
                    iconItem.setAttribute("selected", "");
                }
            });
            iconPicker.appendChild(iconItem);
        }
    
        let newBoxCreateBtn = document.getElementById("new-box-create-btn");
        newBoxCreateBtn.addEventListener("click", async e => {
            newBoxCreateBtn.setAttribute("disabled", "");
            if (await createNewBox()) {
                resetForm();
                document.getElementById("error-message").style.display = "none";
            }
            newBoxCreateBtn.removeAttribute("disabled");
        });

        formIsSetup = true;
    }
}

function populateList(boxes, self) {
    let boxesList = document.getElementById("boxes-container");
    for (let box of boxes) {
        boxesList.appendChild(genNode(box, self));
    }
}

function genNode(box, self) {
    let clone = document.getElementById("demobox").cloneNode(true);
    clone.id = box.id;
    if (box.id === self) {
        clone.classList.add("box-current");
    }
    clone.style.display = "";
    clone.querySelector("img").src = "./icons/" + box.icon;
    clone.querySelector(".box-title").innerText = box.name;
    clone.querySelector(".box-firefox").innerText = "";
    clone.addEventListener("click", e => {
        exec(clone.id);
    });
    return clone
}

//// Actions

function exec(id) {
    browser.runtime.sendMessage({
        type: "exec",
        args: [id]
    });
}

async function initializeList() {
    removeFittingElements(document.getElementById("boxes-container"), ".box:not(#demobox)");
    let boxes = await browser.runtime.sendMessage({ type: "box:ls" });
    let self = await browser.runtime.sendMessage({ type: "whoami" });
    populateList(boxes, self);
    setupForm();
}

initializeList(); //// START

async function createNewBox() {
    let __error = document.getElementById("error-message");

    let __name = document.getElementById("new-box-name");
    let name = __name.value.trim();
    if (name.includes("|")) {
        __error.innerText = "Name must not include: |";
        __error.style.display = "";
        return false;
    }

    let __exec = document.getElementById("new-box-exec");
    let exec = __exec.options[__exec.selectedIndex].value;
    if (exec === "") {
        __error.innerText = "No Firefox version selected";
        __error.style.display = "";
        return false;
    }

    let __icon = document.getElementById("icon-picker");
    let __selected_icon = __icon.querySelector("img[selected]");
    if (__selected_icon === null) {
        __error.innerText = "No icon selected";
        __error.style.display = "";
        return false;
    }
    let icon = __selected_icon.getAttribute("name");

    await browser.runtime.sendMessage({
        type: "box:new",
        args: [icon, name, exec]
    });

    await initializeList();
    
    return true;
}

//// Utilities

function removeFittingElements(element, query) {
    Array.from(element.querySelectorAll(query)).forEach(b => {
        b.parentElement.removeChild(b);
    });
}