export function bindWidget(app, explicit) {
    function resolveWidget() {
        if (explicit && typeof explicit.addEvent === "function") {
            return explicit;
        }
        if (typeof window !== "undefined" && window.widget && typeof window.widget.addEvent === "function") {
            return window.widget;
        }
        try {
            if (window.parent && window.parent !== window && window.parent.widget && typeof window.parent.widget.addEvent === "function") {
                return window.parent.widget;
            }
        } catch (error) {
            return null;
        }
        return null;
    }

    var widget = resolveWidget();

    function dispatch(type, data) {
        if (type === "onLoad" && app.onLoad) {
            app.onLoad(data || {});
        } else if (type === "onRefresh" && app.onRefresh) {
            app.onRefresh(data || {});
        } else if (type === "onSearch" && app.onSearch) {
            app.onSearch(data);
        } else if (type === "setTitle" && widget && widget.setTitle) {
            var title = data && data.title ? data.title : data;
            if (title) {
                widget.setTitle(title);
            }
        }
    }

    if (widget && widget.addEvent && !widget.__enxBoardBound) {
        widget.__enxBoardBound = true;
        widget.addEvent("onLoad", function (data) {
            app.onLoad(data || {});
        });
        widget.addEvent("onRefresh", function (data) {
            app.onRefresh(data || {});
        });
        widget.addEvent("onSearch", function (data) {
            app.onSearch(data);
        });
    }

    var queued = [];
    if (typeof window !== "undefined" && typeof window.__enxTakeWidgetQueue === "function") {
        queued = window.__enxTakeWidgetQueue(function (payload) {
            if (!widget || !widget.addEvent) {
                dispatch(payload.type, payload.data);
            }
        });
    }
    queued.forEach(function (payload) {
        dispatch(payload.type, payload.data);
    });
    return widget;
}
