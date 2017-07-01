($ => {
    "use strict";

    window.OverlayHelper = function (ext) {

        let elements = {};

        /**
         * Creates a new overlay for the given bookmark
         *
         * @param {string} type
         * @param {string} title
         * @param {object} data
         */
        this.create = (type, title, data) => {
            elements.overlay = $('<iframe />').attr("id", ext.opts.ids.page.overlay).appendTo("body");

            if (ext.helper.model.getData("b/animations") === false) {
                elements.overlay.addClass(ext.opts.classes.page.noAnimations);
            }

            ext.helper.stylesheet.addStylesheets(["overlay"], elements.overlay);

            let iframeBody = elements.overlay.find("body");

            elements.modal = $("<div />")
                .attr(ext.opts.attr.type, type)
                .addClass(ext.opts.classes.overlay.modal)
                .appendTo(iframeBody);

            let darkMode = ext.helper.model.getData("a/darkMode");
            if (darkMode === true) {
                iframeBody.addClass(ext.opts.classes.page.darkMode);
            }

            let trackingLabel = type;

            elements.modal.append("<h1>" + title + "</h1>");
            $("<a />").addClass(ext.opts.classes.overlay.close).appendTo(elements.modal);

            elements.buttonWrapper = $("<menu />").addClass(ext.opts.classes.overlay.buttonWrapper).appendTo(elements.modal);
            $("<a />")
                .addClass(ext.opts.classes.overlay.close)
                .appendTo(elements.buttonWrapper);

            setCloseButtonLabel(type === "infos" ? "close" : "cancel");

            switch (type) {
                case "delete": {
                    handleDeleteHtml(data);
                    break;
                }
                case "edit": {
                    handleEditHtml(data);
                    break;
                }
                case "infos": {
                    handleInfosHtml(data);
                    break;
                }
                case "add": {
                    handleAddHtml(data);
                    break;
                }
                case "hide": {
                    handleHideHtml(data);
                    break;
                }
                case "openChildren": {
                    handleOpenChildrenHtml(data);
                    break;
                }
                case "updateUrls": {
                    handleUpdateUrlsHtml(data);
                    break;
                }
            }

            ext.helper.model.call("trackPageView", {page: "/overlay/" + trackingLabel});
            initEvents(data);

            setTimeout(() => {
                elements.modal.addClass(ext.opts.classes.overlay.visible);
                elements.overlay.addClass(ext.opts.classes.page.visible);
            }, 100);
        };

        /**
         * Sets the text for the close button
         *
         * @param {string} type
         */
        let setCloseButtonLabel = (type = "close") => {
            elements.buttonWrapper.children("a." + ext.opts.classes.overlay.close).text(ext.helper.i18n.get("overlay_" + type));
        };

        /**
         * Closes the overlay
         *
         * @param {boolean} cancel
         * @param {string} labelAdd what to add the tracking event label
         */
        let closeOverlay = (cancel = false, labelAdd = "") => {
            ext.helper.model.call("realUrl", {abort: true}); // abort running check url ajax calls
            ext.elements.bookmarkBox["all"].find("li." + ext.opts.classes.drag.isDragged).remove();
            elements.overlay.removeClass(ext.opts.classes.page.visible);

            ext.helper.model.call("trackEvent", {
                category: "overlay",
                action: cancel ? "cancel" : "action",
                label: elements.modal.attr(ext.opts.attr.type) + labelAdd
            });

            ext.helper.scroll.focus();

            setTimeout(() => {
                elements.overlay.remove();
            }, 500);
        };

        /**
         * Appends the bookmark preview to the current overlay
         *
         * @param {object} data
         * @param {boolean} addUrl
         */
        let appendPreviewLink = (data, addUrl) => {
            let preview = $("<" + (data.isDir ? "span" : "a") + " />")
                .attr("title", data.title + (data.url ? "\n" + data.url : ""))
                .addClass(ext.opts.classes.overlay.preview)
                .html(data.title)
                .appendTo(elements.modal);

            if (data.isDir) {
                preview.prepend("<span class='" + ext.opts.classes.sidebar.dirIcon + "' />");
            } else if (data.icon) {
                preview.prepend("<img src='" + data.icon + "' />");
            } else if (ext.opts.demoMode) {
                preview.prepend("<span class='" + ext.opts.classes.sidebar.dirIcon + "' data-color='" + (Math.floor(Math.random() * 10) + 1) + "' />");
            }

            if (addUrl && addUrl === true && data.isDir !== true) {
                $("<a />")
                    .addClass(ext.opts.classes.overlay.previewUrl)
                    .attr("title", data.url)
                    .text(data.url)
                    .insertAfter(preview);
            }
        };

        /**
         * Extends the overlay html for the delete operation
         *
         * @param {object} data
         */
        let handleDeleteHtml = (data) => {
            $("<p />").text(ext.helper.i18n.get("overlay_delete_" + (data.isDir ? "dir" : "bookmark") + "_confirm")).appendTo(elements.modal);
            appendPreviewLink(data);
            $("<a />").addClass(ext.opts.classes.overlay.action).text(ext.helper.i18n.get("overlay_delete")).appendTo(elements.buttonWrapper);
        };

        /**
         * Extends the overlay html for the edit operation
         *
         * @param {object} data
         */
        let handleEditHtml = (data) => {
            appendPreviewLink(data);
            let list = $("<ul />").appendTo(elements.modal);
            list.append("<li><label>" + ext.helper.i18n.get("overlay_bookmark_title") + "</label><input type='text' name='title' value='" + data.title + "' /></li>");
            if (!data.isDir) {
                list.append("<li><label>" + ext.helper.i18n.get("overlay_bookmark_url") + "</label><input type='text' name='url' value='" + data.url + "' /></li>");
            }
            $("<a />").addClass(ext.opts.classes.overlay.action).text(ext.helper.i18n.get("overlay_save")).appendTo(elements.buttonWrapper);
        };

        /**
         * Extends the overlay html for showing the confirm dialog for opening all the bookmarks below the clicked directory
         *
         * @param {object} data
         */
        let handleOpenChildrenHtml = (data) => {
            let bookmarks = data.children.filter(val => !!(val.url));
            let text = ext.helper.i18n.get("overlay_confirm_open_children", [bookmarks.length]);

            $("<p />").text(text).appendTo(elements.modal);
            appendPreviewLink(data);
            $("<a />").addClass(ext.opts.classes.overlay.action).text(ext.helper.i18n.get("overlay_open_children")).appendTo(elements.buttonWrapper);
        };

        /**
         * Extends the overlay html for showing the confirm dialog for hiding bookmarks from the sidebar
         *
         * @param {object} data
         */
        let handleHideHtml = (data) => {
            $("<p />").text(ext.helper.i18n.get("overlay_hide_" + (data.isDir ? "dir" : "bookmark") + "_confirm")).appendTo(elements.modal);
            appendPreviewLink(data);
            $("<a />").addClass(ext.opts.classes.overlay.action).text(ext.helper.i18n.get("overlay_hide_from_sidebar")).appendTo(elements.buttonWrapper);
        };

        /**
         * Extends the overlay html for adding a bookmark or directory
         *
         * @param {object} data
         */
        let handleAddHtml = (data) => {
            let submit = $("<a />").addClass(ext.opts.classes.overlay.action).text(ext.helper.i18n.get("overlay_save")).appendTo(elements.buttonWrapper);
            let menu = $("<menu />").appendTo(elements.modal);
            let bookmarkLink = $("<a />").attr(ext.opts.attr.type, "bookmark").attr("title", ext.helper.i18n.get("overlay_label_bookmark")).appendTo(menu);
            $("<a />").attr(ext.opts.attr.type, "dir").attr("title", ext.helper.i18n.get("overlay_label_dir")).appendTo(menu);
            $("<a />").attr(ext.opts.attr.type, "separator").attr("title", ext.helper.i18n.get("overlay_label_separator")).appendTo(menu);

            menu.children("a").on("click", (e) => {
                e.preventDefault();
                let type = $(e.currentTarget).attr(ext.opts.attr.type);

                if (type === "separator") {
                    ext.helper.specialEntry.addSeparator({id: data.id, index: 0}).then(() => {
                        closeOverlay(false, "_separator");
                        ext.helper.model.call("refreshAllTabs", {type: "Separator"});
                    });
                } else {
                    let list = $("<ul />").appendTo(elements.modal);

                    let titleValue = "";
                    let urlValue = "";

                    if (type === "bookmark") { // default bookmark values -> current page information
                        titleValue = $(document).find("title").text();
                        urlValue = location.href;
                    }

                    if (data && data.values) { // fill fields with given values
                        if (data.values.title) {
                            titleValue = data.values.title;
                        }

                        if (data.values.url) {
                            urlValue = data.values.url;
                        }
                    }

                    list.append("<li><h2>" + $(e.currentTarget).attr("title") + "</h2></li>");
                    list.append("<li><label>" + ext.helper.i18n.get("overlay_bookmark_title") + "</label><input type='text' name='title' value='" + titleValue + "' /></li>");

                    if (type === "bookmark") {
                        list.append("<li><label>" + ext.helper.i18n.get("overlay_bookmark_url") + "</label><input type='text' name='url' value='" + urlValue + "'  /></li>");
                    }

                    menu.addClass(ext.opts.classes.sidebar.hidden);

                    setTimeout(() => {
                        list.addClass(ext.opts.classes.overlay.visible);
                        submit.addClass(ext.opts.classes.overlay.visible);
                    }, data && data.values ? 0 : 100);
                }
            });

            if (data && data.values) { // add bookmark with existing data (e.g. after dragging url into sidebar)
                bookmarkLink.trigger("click");
            }
        };

        /**
         * Extends the overlay html for showing infos about the bookmark
         *
         * @param {object} data
         */
        let handleInfosHtml = (data) => {
            appendPreviewLink(data, true);
            let list = $("<ul />").appendTo(elements.modal);
            let createdDate = new Date(data.dateAdded);

            $("<li />").html(ext.helper.i18n.get("overlay_bookmark_created_date") + " " + ext.helper.i18n.getLocaleDate(createdDate)).appendTo(list);

            if (data.isDir) {
                let childrenEntry = $("<li />")
                    .addClass(ext.opts.classes.overlay.hasTooltip)
                    .append("<span>" + data.childrenAmount.total + "</span>")
                    .append(" " + ext.helper.i18n.get("overlay_dir_children"), false)
                    .appendTo(list);

                $("<ul />")
                    .append("<li>" + data.childrenAmount.bookmarks + " " + ext.helper.i18n.get("overlay_dir_children_bookmarks") + "</li>")
                    .append("<li>" + data.childrenAmount.directories + " " + ext.helper.i18n.get("overlay_dir_children_dirs") + "</li>")
                    .appendTo(childrenEntry);
            }

            let viewsEntry = $("<li />")
                .addClass(ext.opts.classes.overlay.hasTooltip)
                .append("<span>" + data.views.total + "</span>")
                .append(" " + ext.helper.i18n.get("overlay_bookmark_views" + (data.views.total === 1 ? "_single" : "")), false)
                .appendTo(list);

            $("<ul />")
                .append("<li>" + ext.helper.i18n.get("overlay_bookmark_views_since") + " " + ext.helper.i18n.getLocaleDate(data.views.startDate) + "</li>")
                .append("<li>" + data.views.perMonth + " " + ext.helper.i18n.get("overlay_bookmark_views" + (data.views.perMonth === 1 ? "_single" : "")) + " " + ext.helper.i18n.get("overlay_bookmark_views_per_month") + "</li>")
                .appendTo(viewsEntry);
        };

        /**
         * Generates a list with all urls which have changed or could not be found
         *
         * @param {Array} updateList
         */
        let handleUpdateUrlsFinished = (updateList) => {
            let hasResults = updateList.length > 0;

            setTimeout(() => {
                elements.desc.remove();
                elements.progressBar.remove();
                elements.progressLabel.remove();

                hasResults && elements.modal.addClass(ext.opts.classes.overlay.urlCheckList);

                setTimeout(() => {
                    elements.loader.remove();
                    elements.modal.removeClass(ext.opts.classes.overlay.urlCheckLoading);
                    setCloseButtonLabel("close");

                    if (updateList.length === 0) {
                        $("<p />").addClass(ext.opts.classes.overlay.success).text(ext.helper.i18n.get("overlay_check_urls_no_results")).appendTo(elements.modal);
                    } else {
                        $("<a />").addClass(ext.opts.classes.overlay.action).text(ext.helper.i18n.get("overlay_update")).appendTo(elements.buttonWrapper);
                        let scrollBox = ext.helper.scroll.add(ext.opts.ids.overlay.urlList, $("<ul />").appendTo(elements.modal));
                        let overlayBody = elements.overlay.find("body");

                        updateList.forEach((entry) => {
                            let listEntry = $("<li />")
                                .data("entry", entry)
                                .append(ext.helper.checkbox.get(overlayBody, {checked: "checked"}))
                                .append("<strong>" + entry.title + "</strong>");

                            $("<a />").attr({
                                href: entry.url, title: entry.url, target: "_blank"
                            }).html("<span>" + entry.url + "</span>").appendTo(listEntry);

                            if (entry.urlStatusCode === 404) {
                                $("<span />").text(ext.helper.i18n.get("overlay_check_urls_not_found")).appendTo(listEntry);
                            } else if (entry.newUrl !== entry.url) {
                                $("<a />").attr({
                                    href: entry.newUrl, title: entry.newUrl, target: "_blank"
                                }).html("<span>" + entry.newUrl + "</span>").appendTo(listEntry);
                            }

                            listEntry = listEntry.appendTo(scrollBox.children("ul"));

                            ext.helper.model.call("favicon", {url: entry.url}).then((response) => { // retrieve favicon of url
                                if (response.img) { // favicon found -> add to entry
                                    $("<img src='" + response.img + "' />").insertAfter(listEntry.children("div." + ext.opts.classes.checkbox.box))
                                }
                            });
                        });
                    }
                }, hasResults ? 1000 : 0);

            }, 1000);
        };

        /**
         * Extends the overlay html for the url update process
         *
         * @param {object} data
         */
        let handleUpdateUrlsHtml = (data) => {
            elements.loader = ext.helper.template.loading().appendTo(elements.modal);
            elements.desc = $("<p />").text(ext.helper.i18n.get("overlay_check_urls_loading")).appendTo(elements.modal);

            ext.helper.model.call("websiteStatus").then((opts) => {
                if (opts.status === "available") {
                    let bookmarks = [];

                    let processBookmarks = (entries) => { // check all subordinate bookmarks of the given directory
                        entries.forEach((entry) => {
                            if (entry.url) {
                                bookmarks.push(entry);
                            } else if (entry.children) {
                                processBookmarks(entry.children);
                            }
                        });
                    };
                    processBookmarks(data.children);
                    let bookmarkAmount = bookmarks.length;

                    elements.progressBar = $("<div />").addClass(ext.opts.classes.overlay.progressBar).html("<div />").appendTo(elements.modal);
                    elements.progressLabel = $("<span />").addClass(ext.opts.classes.overlay.checkUrlProgressLabel).html("<span>0</span>/<span>" + bookmarkAmount + "</span>").appendTo(elements.modal);

                    setTimeout(() => {
                        elements.modal.addClass(ext.opts.classes.overlay.urlCheckLoading);
                    }, 500);

                    let finished = 0;
                    let updateList = [];
                    bookmarks.forEach((bookmark) => {
                        ext.helper.model.call("realUrl", {url: bookmark.url}).then((response) => {
                            finished++;
                            elements.progressBar.children("div").css("width", (finished / bookmarkAmount * 100) + "%");
                            elements.progressLabel.children("span").eq(0).text(finished);

                            if (+response.code === 404 || (bookmark.url !== response.url && +response.code !== 302)) { // show all urls which have changed permanently and broken links
                                bookmark.newUrl = response.url;
                                bookmark.urlStatusCode = +response.code;
                                updateList.push(bookmark);
                            }

                            if (finished === bookmarkAmount) {
                                handleUpdateUrlsFinished(updateList);
                            }
                        });
                    });
                } else { // website not available -> show message
                    elements.loader.remove();
                    elements.desc.remove();

                    $("<div />").addClass(ext.opts.classes.overlay.inputError)
                        .append("<h3>" + ext.helper.i18n.get("status_service_unavailable_headline") + "</h3>")
                        .append("<p>" + ext.helper.i18n.get("status_check_urls_unavailable_desc") + "</p>")
                        .appendTo(elements.modal);

                    setCloseButtonLabel("close");
                }
            });
        };

        /**
         * Opens all the given bookmarks in new tab
         *
         * @param {object} data
         */
        let openChildren = (data) => {
            closeOverlay();
            let bookmarks = data.children.filter(val => !!(val.url));
            ext.helper.utility.openAllBookmarks(bookmarks, ext.helper.model.getData("b/newTab") === "foreground");
        };

        /**
         * Hides the given bookmark or directory from the sidebar
         *
         * @param {object} data
         */
        let hideBookmark = (data) => {
            ext.startLoading();
            closeOverlay();

            let hiddenEntries = ext.helper.model.getData("u/hiddenEntries");
            hiddenEntries[data.id] = true;

            ext.helper.model.setData({"u/hiddenEntries": hiddenEntries}).then(() => {
                ext.helper.model.call("refreshAllTabs", {type: "Hide"});
            });
        };

        /**
         * Deletes the given bookmark or directory recursively
         *
         * @param {object} data
         */
        let deleteBookmark = (data) => {
            closeOverlay();

            ext.helper.model.call("deleteBookmark", {id: data.id}).then(() => {
                data.element.parent("li").remove();
            });
        };

        /**
         * Validates the modal form for editing or adding entries,
         * returns the content of the fields and whether the form is filled properly
         *
         * @param {boolean} isDir
         * @returns {Object}
         */
        let getFormValues = (isDir) => {
            let titleInput = elements.modal.find("input[name='title']").removeClass(ext.opts.classes.overlay.inputError);
            let urlInput = elements.modal.find("input[name='url']").removeClass(ext.opts.classes.overlay.inputError);

            let ret = {
                errors: false,
                values: {
                    title: titleInput[0].value.trim(),
                    url: isDir ? null : urlInput[0].value.trim()
                }
            };

            if (ret.values.title.length === 0) {
                titleInput.addClass(ext.opts.classes.overlay.inputError);
                ret.errors = true;
            }
            if (!isDir && ret.values.url.length === 0) {
                urlInput.addClass(ext.opts.classes.overlay.inputError);
                ret.errors = true;
            }

            if (ret.values.url !== null && ret.values.url.search(/^\w+\:\/\//) !== 0) { // prepend http if no protocol specified
                ret.values.url = "http://" + ret.values.url;
            }

            return ret;
        };

        /**
         * Updates the given bookmark or directory (title, url)
         *
         * @param {object} data
         */
        let editEntry = (data) => {
            let formValues = getFormValues(data.isDir);

            if (formValues.errors === false) {
                ext.helper.model.call("updateBookmark", {
                    id: data.id,
                    title: formValues.values.title,
                    url: formValues.values.url
                }).then((result) => {
                    if (result.error) {
                        elements.modal.find("input[name='url']").addClass(ext.opts.classes.overlay.inputError);
                    } else {
                        closeOverlay();
                        data.title = formValues.values.title;
                        data.url = formValues.values.url;
                        data.element.children("span." + ext.opts.classes.sidebar.bookmarkLabel).text(data.title);
                    }
                });
            }
        };

        /**
         * Adds a bookmark or directory to the given directory
         *
         * @param {object} data
         */
        let addEntry = (data) => {
            let formValues = getFormValues(elements.modal.find("input[name='url']").length() === 0);

            if (formValues.errors === false) {
                let obj = {
                    title: formValues.values.title,
                    url: formValues.values.url,
                    parentId: data.id || null,
                    index: 0
                };

                if (data && data.values) { // use given data (available e.g. after dragging a url into the sidebar)
                    if (data.values.index) {
                        obj.index = data.values.index;
                    }

                    if (data.values.parentId) {
                        obj.parentId = data.values.parentId;
                    }
                }

                ext.helper.model.call("createBookmark", obj).then((result) => {
                    if (result.error) {
                        elements.modal.find("input[name='url']").addClass(ext.opts.classes.overlay.inputError);
                    } else {
                        closeOverlay(false, "_" + (obj.url ? "bookmark" : "directory"));
                    }
                });
            }
        };

        /**
         * Updates all bookmarks which are checked,
         * deletes entries with non existing urls,
         * updates entries with changed urls
         */
        let updateBookmarkUrls = () => {
            elements.modal.find("div#" + ext.opts.ids.overlay.urlList + " ul > li").forEach((elm) => {
                if ($(elm).find("input[type='checkbox']")[0].checked) {
                    let entry = $(elm).data("entry");

                    if (entry.urlStatusCode === 404) {
                        ext.helper.model.call("deleteBookmark", {id: entry.id});
                    } else if (entry.url !== entry.newUrl) {
                        ext.helper.model.call("updateBookmark", {id: entry.id, title: entry.title, url: entry.newUrl});
                    }
                }
            });

            closeOverlay();
        };

        /**
         * Initializes the events for the currently displayed overlay
         *
         * @param {object} data
         */
        let initEvents = (data) => {
            elements.overlay.find("body").on("click", (e) => { // close overlay when click outside the modal
                if (e.target.tagName === "BODY") {
                    closeOverlay(true);
                }
            });

            elements.modal.find("a." + ext.opts.classes.overlay.close).on("click", (e) => { // close overlay by close button
                e.preventDefault();
                closeOverlay(true);
            });

            elements.modal.on("click", "a." + ext.opts.classes.overlay.action, (e) => { // perform the action
                e.preventDefault();

                switch (elements.modal.attr(ext.opts.attr.type)) {
                    case "delete": {
                        deleteBookmark(data);
                        break;
                    }
                    case "hide": {
                        hideBookmark(data);
                        break;
                    }
                    case "openChildren": {
                        openChildren(data);
                        break;
                    }
                    case "edit": {
                        editEntry(data);
                        break;
                    }
                    case "add": {
                        addEntry(data);
                        break;
                    }
                    case "updateUrls": {
                        updateBookmarkUrls();
                        break;
                    }
                }
            });

            elements.modal.on("focus", "input", (e) => { // remove error class from input fields
                $(e.currentTarget).removeClass(ext.opts.classes.overlay.inputError);
            });

            elements.modal.find("a." + ext.opts.classes.overlay.preview + ", a." + ext.opts.classes.overlay.previewUrl).on("click", (e) => { // open bookmark
                e.preventDefault();
                ext.helper.model.call("trackEvent", {
                    category: "url",
                    action: "open",
                    label: "new_tab_overlay"
                });
                ext.helper.utility.openUrl(data, "newTab");
            });
        };
    };

})(jsu);