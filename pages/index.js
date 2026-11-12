import { useEffect, useRef, useState } from "react";
import { Board } from "../components/Board";
import { createBoardController } from "../lib/controller";

var empty = {
    screen: "list",
    query: "",
    list: null,
    post: null,
    errors: [],
    notice: "",
};

export default function Page() {
    var stateBox = useState(empty);
    var state = stateBox[0];
    var setState = stateBox[1];
    var controllerRef = useRef(null);

    useEffect(function () {
        var alive = true;
        var root = document.getElementById("board");
        var widget = null;
        try {
            if (window.widget && window.widget.addEvent) {
                widget = window.widget;
            } else if (window.parent && window.parent.widget) {
                widget = window.parent.widget;
            }
        } catch (error) {
            widget = null;
        }
        var controller = createBoardController({
            root: root,
            widget: widget,
            title: "ENXBoard",
            appId: "ENXBoardNext",
            postsUrl: "data/posts.json",
            paint: function (snap) {
                if (alive) {
                    setState(snap);
                }
            },
        });
        controllerRef.current = controller;
        controller.init();
        return function () {
            alive = false;
            window.clearTimeout(controller.refreshTimer);
        };
    }, []);

    return (
        <div id="board">
            <Board
                state={state}
                onCommand={function (command, payload) {
                    if (controllerRef.current) {
                        controllerRef.current.handle(command, payload);
                    }
                }}
            />
        </div>
    );
}
