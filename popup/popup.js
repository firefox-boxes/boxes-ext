//// Setup

let everythingIsSetup = false;

function resetContextMenu() {
    document.getElementById("context-menu").classList.remove("context-menu--active");
    document.getElementById("context-menu").removeAttribute("data-context");
}

function setupContextMenu() {
    if (!everythingIsSetup) {
        document.body.addEventListener("click", e => {
            resetContextMenu();
        });
        let contextMenu = document.getElementById("context-menu");
        let __edit = document.querySelector(".context-menu__item[data-action=edit]");
        __edit.addEventListener("click", async e => {
            let context = contextMenu.getAttribute("data-context");
            let attrs = await browser.runtime.sendMessage({
                type: "box:attrs get",
                args: [context]
            });
            document.getElementById("new-box-name").value = attrs.name;
            let __exec = document.getElementById("new-box-exec");
            __exec.setAttribute("disabled", "");
            for (let i = 0; i < __exec.options.length; i++) {
                if (__exec.options[i].value === attrs.exec) {
                    __exec.selectedIndex = i;
                    break;
                }
            }
            let iconPickerItems = Array.from(document.getElementsByClassName("icon-picker-item"));
            for (let i = 0; i < iconPickerItems.length; i++) {
                if (iconPickerItems[i].getAttribute("name") === attrs.icon) {
                    iconPickerItems[i].setAttribute("selected", "");
                    break;
                }
            }
            document.getElementById("new-box-is-default").checked = ((await browser.runtime.sendMessage({
                type: "default:get"
            })) === context);
            // Set the `data-editing` attribute on the create button
            document.getElementById("new-box-create-btn").setAttribute("data-editing", context);
            // Show the form
            showForm();
        });
        let __delete = document.querySelector(".context-menu__item[data-action=delete]");
        __delete.addEventListener("click", async e => {
            let context = contextMenu.getAttribute("data-context");
            let name = document.getElementById(context).querySelector(".box-title").innerText;
            if (window.confirm("Permanently delete box '" + name + "'?")) {
                await browser.runtime.sendMessage({
                    type: "box:del",
                    args: [context]
                });
                await initializeList();
            }
        });
    }
}

function showForm() {
    document.getElementById("add-btn").style.display = "none";
    document.getElementById("add-form").style.display = "";
}

function setupForm() {
    if (!everythingIsSetup) {
        function resetForm() {
            document.getElementById("add-btn").style.display = "";
            document.getElementById("add-form").style.display = "none";
            document.getElementById("new-box-name").value = "";
            document.getElementById("new-box-is-default").checked = false;
            document.getElementById("new-box-exec").selectedIndex = 0;
            document.getElementById("new-box-exec").removeAttribute("disabled");
            let last = iconPicker.querySelector(".icon-picker-item[selected]");
            if (last !== null) last.removeAttribute("selected");
            document.getElementById("new-box-create-btn").removeAttribute("data-editing")
        }
    
        document.getElementById("add-btn").addEventListener("click", e => {
            showForm();
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
    
        const ICONS = ["box.svg", "backpack.svg", "beach.svg", "cap.svg", "crescent-moon.svg", "work.svg"];
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
    clone.addEventListener("contextmenu", e => {
        e.preventDefault();
        e.stopPropagation();
        let contextMenu = document.getElementById("context-menu");
        contextMenu.setAttribute("data-context", clone.id);
        contextMenu.style.left = e.pageX + "px";
        contextMenu.style.top = e.pageY + "px";
        contextMenu.classList.add("context-menu--active");
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
    setupContextMenu();
    setupForm();
    everythingIsSetup = true;
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

    let id;

    let __create_button = document.getElementById("new-box-create-btn");
    if (__create_button.hasAttribute("data-editing")) {
        id = __create_button.getAttribute("data-editing");
        await browser.runtime.sendMessage({
            type: "box:attrs set",
            args: [id, icon, name, exec]
        });
        __create_button.removeAttribute("data-editing");
    } else {
        id = await browser.runtime.sendMessage({
            type: "box:new",
            args: [icon, name, exec]
        });
    }

    let __is_default = document.getElementById("new-box-is-default");
    if (__is_default.checked) {
        await browser.runtime.sendMessage({
            type: "default:set",
            args: [id]
        });
    }

    await initializeList();
    
    return true;
}

//// Utilities

function removeFittingElements(element, query) {
    Array.from(element.querySelectorAll(query)).forEach(b => {
        b.parentElement.removeChild(b);
    });
}