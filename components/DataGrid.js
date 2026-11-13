/*
 * Next용 DataGridView다. 열 너비, 순서, 고정, 필터, 정렬, 선택은 lib/grid.js가 계산한다.
 * JSX는 Next가 페이지 번들로 넣는다. Vue와 React도 같은 계산을 쓴다.
 * 스크롤과 열 너비는 team-flow ScrollableTable이 우선이다. 표는 하나고 헤더는 붙는다.
 * 헤더와 같은 칸의 본문 셀에 너비, 최소, 최대를 같이 쓴다. 트리, 정렬, 필터, 선택은 그 위에 더한다.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
    cellValue,
    estimateWidth,
    layoutColumns,
    loadLayout,
    moveColumn,
    nextSort,
    resizeColumn,
    saveLayout,
    selectRange,
    selectedNodes,
    toggleFlag,
    toggleSelection,
    visibleRows,
} from "../lib/grid";

export function DataGrid(props) {
    var rows = props.rows || [];
    var columns = props.columns || [];
    var sortModel = props.sortModel || [];
    var filters = props.filters || {};
    var layoutState = useState(function () { return loadLayout(props.identifier); });
    var layout = layoutState[0];
    var setLayout = layoutState[1];
    var expandedState = useState({});
    var expanded = expandedState[0];
    var setExpanded = expandedState[1];
    var selectedState = useState({});
    var selected = selectedState[0];
    var setSelected = selectedState[1];
    var anchorState = useState("");
    var anchor = anchorState[0];
    var setAnchor = anchorState[1];
    var menuState = useState(null);
    var menu = menuState[0];
    var setMenu = menuState[1];
    var dragState = useState({ column: "", row: "" });
    var drag = dragState[0];
    var setDrag = dragState[1];
    var editState = useState(null);
    var editing = editState[0];
    var setEditing = editState[1];
    var rootRef = useRef(null);
    var scrollerRef = useRef(null);
    var hBarState = useState({ overflow: false, thumbWidth: 32, thumbLeft: 0 });
    var hBar = hBarState[0];
    var setHBar = hBarState[1];
    var hBarRef = useRef(hBar);
    hBarRef.current = hBar;
    var measureRef = useRef(function () {});

    var prepared = useMemo(function () { return layoutColumns(columns, layout); }, [columns, layout]);
    var viewRows = useMemo(function () { return visibleRows(rows, sortModel, expanded); }, [rows, sortModel, expanded]);

    useEffect(function () {
        function close() { setMenu(null); }
        window.addEventListener("click", close);
        return function () { window.removeEventListener("click", close); };
    }, []);

    useEffect(function () {
        var container = rootRef.current;
        if (!container) return;
        container.querySelectorAll("thead th, tbody td").forEach(function (cell) {
            if (cell.querySelector("a")) return;
            var text = (cell.textContent || "").trim();
            if (text) cell.title = text;
        });
    });

    function measureHBar() {
        var el = scrollerRef.current;
        if (!el) return;
        var max = el.scrollWidth - el.clientWidth;
        var overflow = max > 1;
        var track = el.clientWidth;
        var thumbWidth = overflow ? Math.max(32, Math.round((track * el.clientWidth) / el.scrollWidth)) : 0;
        var thumbLeft = overflow ? Math.round((el.scrollLeft / max) * Math.max(0, track - thumbWidth)) : 0;
        var prev = hBarRef.current;
        if (prev.overflow === overflow && prev.thumbWidth === thumbWidth && prev.thumbLeft === thumbLeft) return;
        var next = { overflow: overflow, thumbWidth: thumbWidth, thumbLeft: thumbLeft };
        hBarRef.current = next;
        setHBar(next);
    }
    measureRef.current = measureHBar;

    function onHScrollDown(event) {
        var el = scrollerRef.current;
        if (!el || event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        var track = event.currentTarget.getBoundingClientRect();
        var max = el.scrollWidth - el.clientWidth;
        var thumb = hBarRef.current.thumbWidth;
        var travel = Math.max(1, track.width - thumb);
        var pointer = event.clientX - track.left;
        var onThumb = pointer >= hBarRef.current.thumbLeft && pointer <= hBarRef.current.thumbLeft + thumb;
        if (!onThumb) {
            el.scrollLeft = Math.max(0, Math.min(max, ((pointer - thumb / 2) / travel) * max));
            measureRef.current();
        }
        var startX = event.clientX;
        var startLeft = el.scrollLeft;
        event.currentTarget.classList.add("dragging");
        function move(moveEvent) {
            el.scrollLeft = Math.max(0, Math.min(max, startLeft + ((moveEvent.clientX - startX) * max) / travel));
            measureRef.current();
        }
        function up() {
            document.removeEventListener("mousemove", move);
            document.removeEventListener("mouseup", up);
            if (event.currentTarget) event.currentTarget.classList.remove("dragging");
        }
        document.addEventListener("mousemove", move);
        document.addEventListener("mouseup", up);
    }

    useEffect(function () {
        var el = scrollerRef.current;
        if (!el) return;
        function onWheel(event) {
            var box = scrollerRef.current;
            if (!box) return;
            var max = box.scrollWidth - box.clientWidth;
            if (max <= 0) return;
            var delta = 0;
            if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) delta = event.deltaX;
            else if (event.shiftKey) delta = event.deltaY;
            else if (box.scrollHeight <= box.clientHeight + 1) delta = event.deltaY;
            if (!delta) return;
            event.preventDefault();
            box.scrollLeft = Math.max(0, Math.min(max, box.scrollLeft + delta));
            measureRef.current();
        }
        function measure() { measureRef.current(); }
        el.addEventListener("wheel", onWheel, { passive: false });
        el.addEventListener("scroll", measure);
        var observer = window.ResizeObserver ? new ResizeObserver(measure) : null;
        if (observer) {
            observer.observe(el);
            if (el.firstElementChild) observer.observe(el.firstElementChild);
        }
        measure();
        return function () {
            el.removeEventListener("wheel", onWheel);
            el.removeEventListener("scroll", measure);
            if (observer) observer.disconnect();
        };
    }, []);

    function persist(next) {
        setLayout(next);
        if (props.identifier) saveLayout(props.identifier, next);
    }

    function publishSelection(nextSelected) {
        setSelected(nextSelected);
        if (props.onSelect) props.onSelect(selectedNodes(rows, nextSelected));
    }

    function sortMark(column) {
        var index = sortModel.findIndex(function (item) { return item.dataIndex === column.dataIndex; });
        if (index < 0) return "";
        var name = sortModel[index].sort === "desc" ? "내림차순" : "오름차순";
        return sortModel.length > 1 ? name + " " + (index + 1) : name;
    }

    function stickyLeft(column, index) {
        if (!column.pinned) return undefined;
        var left = (props.showRowIndexFlag === false ? 0 : 44) + (props.showSelectionCheckBoxesFlag === false ? 0 : 36);
        for (var i = 0; i < index; i += 1) {
            if (prepared.visible[i].pinned) left += prepared.visible[i].width;
        }
        return left + "px";
    }

    function applyColumnWidth(headerCell, width) {
        var px = Math.max(50, Math.round(width)) + "px";
        var table = headerCell.closest("table");
        var index = Array.prototype.indexOf.call(headerCell.parentElement.children, headerCell);
        Array.prototype.forEach.call(table.querySelectorAll("tr"), function (row) {
            var cell = row.children[index];
            if (!cell) return;
            cell.style.width = px;
            cell.style.minWidth = px;
            cell.style.maxWidth = px;
        });
    }

    function onResizeDown(event, column) {
        if (column.resizableFlag === false) return;
        event.preventDefault();
        event.stopPropagation();
        var resizer = event.currentTarget;
        var headerCell = resizer.parentElement;
        var startX = event.pageX;
        var startWidth = headerCell.offsetWidth;
        resizer.classList.add("resizing");
        document.body.style.cursor = "col-resize";
        function move(moveEvent) {
            applyColumnWidth(headerCell, startWidth + moveEvent.pageX - startX);
        }
        function up(upEvent) {
            document.removeEventListener("mousemove", move);
            document.removeEventListener("mouseup", up);
            document.body.style.cursor = "";
            resizer.classList.remove("resizing");
            persist(resizeColumn(layout, column.dataIndex, startWidth + upEvent.pageX - startX));
        }
        document.addEventListener("mousemove", move);
        document.addEventListener("mouseup", up);
    }

    function fit(column) {
        var values = viewRows.map(function (row) { return cellValue(column, row.node).label; });
        persist(resizeColumn(layout, column.dataIndex, estimateWidth(column.text, values)));
    }

    function openMenu(event, kind, payload) {
        event.preventDefault();
        event.stopPropagation();
        setMenu({ kind: kind, x: event.clientX, y: event.clientY, payload: payload });
    }

    function onMenu(action) {
        var column = menu && menu.payload;
        if (action === "asc" || action === "desc") props.onSort && props.onSort([{ dataIndex: column.dataIndex, sort: action === "desc" ? "desc" : "asc" }]);
        else if (action === "clear-sort") props.onSort && props.onSort(sortModel.filter(function (item) { return item.dataIndex !== column.dataIndex; }));
        else if (action === "hide" || action === "pin") persist(toggleFlag(layout, column.dataIndex, action === "hide" ? "hidden" : "pinned"));
        else if (action === "fit") fit(column);
        else if (action === "reset-width") {
            var widths = Object.assign({}, layout.widths);
            delete widths[column.dataIndex];
            persist(Object.assign({}, layout, { widths: widths }));
        } else if (action === "open" && props.onActivate) {
            props.onActivate({ node: column.node, column: { dataIndex: "tree" }, value: { label: column.node.title || column.node.label } });
        }
        setMenu(null);
    }

    var showIndex = props.showRowIndexFlag !== false;
    var showChecks = props.showSelectionCheckBoxesFlag !== false;
    var showMenuColumn = props.showContextualMenuColumnFlag !== false;
    var allChecked = viewRows.length > 0 && viewRows.every(function (row) { return selected[row.id]; });
    function columnBox(column, index) {
        return { width: column.width, minWidth: column.width, maxWidth: column.width, left: stickyLeft(column, index) };
    }

    return (
        <div
            ref={rootRef}
            className="enx-grid-wrap"
            tabIndex={0}
            onKeyDown={function (event) {
                if (!viewRows.length) return;
                var ids = viewRows.map(function (row) { return row.id; });
                var current = ids.indexOf(anchor);
                if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                    event.preventDefault();
                    var nextIndex = event.key === "ArrowDown" ? Math.min(ids.length - 1, current + 1) : Math.max(0, current < 0 ? 0 : current - 1);
                    setAnchor(ids[nextIndex]);
                    publishSelection(toggleSelection({}, ids[nextIndex], "single"));
                } else if (event.key === "Enter" && anchor) {
                    var row = viewRows.filter(function (item) { return item.id === anchor; })[0];
                    var column = prepared.visible.filter(function (item) { return item.dataIndex === "tree"; })[0] || prepared.visible[0];
                    if (row && column && props.onActivate) props.onActivate({ node: row.node, column: column, value: cellValue(column, row.node) });
                }
            }}
        >
            <div className="enx-grid-tools">
                <button type="button" onClick={function (event) { openMenu(event, "columns", null); }}>열</button>
            </div>
            <div className="enx-grid-frame">
            <div ref={scrollerRef} className="enx-grid-scroll scrollable-table-container-single" onScroll={measureHBar}>
                <table className={"enx-grid" + (props.showColumnBorderFlag === false ? "" : " borders") + (props.showAlternateBackgroundFlag === false ? "" : " stripes")}>
                    <thead>
                        <tr>
                            {showIndex ? <th className="index" style={{ width: 44, minWidth: 44, maxWidth: 44 }}></th> : null}
                            {showChecks ? <th style={{ width: 36, minWidth: 36, maxWidth: 36 }}>{props.rowSelection === "single" ? null : <input type="checkbox" checked={allChecked} onChange={function () {}} onClick={function (event) { event.stopPropagation(); var next = {}; if (!allChecked) viewRows.forEach(function (row) { next[row.id] = true; }); publishSelection(next); }} />}</th> : null}
                            {prepared.visible.map(function (column, index) {
                                return (
                                    <th key={column.dataIndex} className={column.pinned ? "pinned" : undefined} style={columnBox(column, index)} onDragOver={function (event) { event.preventDefault(); }} onDrop={function (event) { event.preventDefault(); if (!drag.column || drag.column === column.dataIndex) return; persist(moveColumn(layout, prepared.order, drag.column, column.dataIndex)); setDrag({ column: "", row: "" }); }} onContextMenu={function (event) { openMenu(event, "header", column); }}>
                                        <button type="button" className="header" draggable={props.columnDragEnabledFlag !== false} onDragStart={function (event) { setDrag({ column: column.dataIndex, row: "" }); event.dataTransfer.setData("text/plain", column.dataIndex); }} onClick={function (event) { if (column.sortableFlag === false || !props.onSort) return; props.onSort(nextSort(sortModel, column.dataIndex, event.shiftKey)); }}>
                                            {column.text}
                                            {sortMark(column) ? <span className="sort">{sortMark(column)}</span> : null}
                                        </button>
                                        {column.resizableFlag !== false ? <div className="column-resizer" onMouseDown={function (event) { onResizeDown(event, column); }} onDoubleClick={function (event) { event.preventDefault(); event.stopPropagation(); fit(column); }} /> : null}
                                    </th>
                                );
                            })}
                            {showMenuColumn ? <th style={{ width: 44, minWidth: 44, maxWidth: 44 }}></th> : null}
                        </tr>
                        <tr className="filters">
                            {showIndex ? <th style={{ width: 44, minWidth: 44, maxWidth: 44 }}></th> : null}
                            {showChecks ? <th style={{ width: 36, minWidth: 36, maxWidth: 36 }}></th> : null}
                            {prepared.visible.map(function (column, index) {
                                return (
                                    <th key={"filter-" + column.dataIndex} className={column.pinned ? "pinned" : undefined} style={columnBox(column, index)}>
                                        <input value={filters[column.dataIndex] || ""} placeholder={column.typeRepresentation === "number" ? "> 10" : "필터"} onClick={function (event) { event.stopPropagation(); }} onChange={function (event) { if (!props.onFilter) return; var next = Object.assign({}, filters); if (event.target.value) next[column.dataIndex] = event.target.value; else delete next[column.dataIndex]; props.onFilter(next); }} />
                                    </th>
                                );
                            })}
                            {showMenuColumn ? <th style={{ width: 44, minWidth: 44, maxWidth: 44 }}></th> : null}
                        </tr>
                    </thead>
                    <tbody>
                        {viewRows.length ? viewRows.map(function (row, rowIndex) {
                            return (
                                <tr key={row.id} className={(selected[row.id] ? "selected " : "") + (props.showAlternateBackgroundFlag !== false && rowIndex % 2 === 1 ? "alt" : "")} onClick={function (event) { if ((props.rowSelection || "multiple") === "multiple" && event.shiftKey && anchor) { publishSelection(selectRange(viewRows.map(function (item) { return item.id; }), anchor, row.id)); return; } setAnchor(row.id); publishSelection(toggleSelection(selected, row.id, props.rowSelection || "multiple")); }} onDragOver={function (event) { event.preventDefault(); }} onDrop={function (event) { event.preventDefault(); var from = drag.row; setDrag({ column: "", row: "" }); if (!from || from === row.id || !props.onReorder) return; var source = viewRows.filter(function (item) { return item.id === from; })[0]; if (!source || source.parentId !== row.parentId) return; props.onReorder({ id: from, beforeId: row.id }); }}>
                                    {showIndex ? <td className="index" style={{ width: 44, minWidth: 44, maxWidth: 44 }}>{props.rowDragEnabledFlag === false ? null : <button type="button" className="drag" draggable onDragStart={function (event) { event.stopPropagation(); setDrag({ column: "", row: row.id }); event.dataTransfer.setData("text/plain", row.id); }} onClick={function (event) { event.stopPropagation(); }}>≡</button>}{rowIndex + 1}</td> : null}
                                    {showChecks ? <td style={{ width: 36, minWidth: 36, maxWidth: 36 }}><input type="checkbox" checked={!!selected[row.id]} onChange={function () {}} onClick={function (event) { event.stopPropagation(); setAnchor(row.id); publishSelection(toggleSelection(selected, row.id, props.rowSelection || "multiple")); }} /></td> : null}
                                    {prepared.visible.map(function (column, index) {
                                        var value = cellValue(column, row.node);
                                        var query = String(props.findQuery || "").trim().toLowerCase();
                                        var isMatch = query && String(value.label || "").toLowerCase().indexOf(query) !== -1;
                                        var isEditing = editing && editing.id === row.id && editing.dataIndex === column.dataIndex;
                                        return (
                                            <td key={column.dataIndex} className={(column.pinned ? "pinned " : "") + (isMatch ? "match" : "")} style={columnBox(column, index)} onDoubleClick={function (event) { if (!column.editableFlag) return; event.stopPropagation(); setEditing({ id: row.id, dataIndex: column.dataIndex, value: value.label }); }}>
                                                {isEditing ? <input value={editing.value} onClick={function (event) { event.stopPropagation(); }} onChange={function (event) { setEditing({ id: editing.id, dataIndex: editing.dataIndex, value: event.target.value }); }} onBlur={function () { var payload = editing; setEditing(null); if (props.onCellEdit) props.onCellEdit(payload); }} onKeyDown={function (event) { if (event.key !== "Enter") return; event.preventDefault(); var payload = editing; setEditing(null); if (props.onCellEdit) props.onCellEdit(payload); }} /> : column.dataIndex === "tree" ? (
                                                    <div className="tree-cell" style={{ paddingLeft: row.depth * 16 }}>
                                                        {row.hasChildren ? <button type="button" className={row.expanded ? "twist expanded" : "twist"} aria-expanded={row.expanded ? "true" : "false"} onClick={function (event) { event.stopPropagation(); setExpanded(function (current) { var next = Object.assign({}, current); next[row.id] = !row.expanded; return next; }); }}><span className="mark" /></button> : <span className="twist-gap" />}
                                                        <button type="button" className="link" onClick={function (event) { event.stopPropagation(); if (typeof value.func === "function") value.func(); if (props.onActivate) props.onActivate({ node: row.node, column: column, value: value }); }}>{value.label}</button>
                                                    </div>
                                                ) : value.func ? <button type="button" className="link" onClick={function (event) { event.stopPropagation(); value.func(); if (props.onActivate) props.onActivate({ node: row.node, column: column, value: value }); }}>{value.label}</button> : value.label}
                                            </td>
                                        );
                                    })}
                                    {showMenuColumn ? <td style={{ width: 44, minWidth: 44, maxWidth: 44 }}><button type="button" className="row-menu" onClick={function (event) { openMenu(event, "row", row); }}>⋯</button></td> : null}
                                </tr>
                            );
                        }) : <tr><td colSpan={prepared.visible.length + (showIndex ? 1 : 0) + (showChecks ? 1 : 0) + (showMenuColumn ? 1 : 0)} className="empty">{props.emptyText || "표시할 행이 없습니다."}</td></tr>}
                    </tbody>
                </table>
            </div>
            {hBar.overflow ? (
                <div className="enx-hscroll" role="scrollbar" aria-orientation="horizontal" aria-label="가로 스크롤" onMouseDown={onHScrollDown}>
                    <div className="enx-hscroll-thumb" style={{ width: hBar.thumbWidth, left: hBar.thumbLeft }} />
                </div>
            ) : null}
            </div>
            {menu ? (
                <div className="enx-grid-menu" style={{ left: menu.x, top: menu.y }} onClick={function (event) { event.stopPropagation(); }}>
                    {menu.kind === "header" ? (
                        <div>
                            <button type="button" onClick={function () { onMenu("asc"); }}>오름차순</button>
                            <button type="button" onClick={function () { onMenu("desc"); }}>내림차순</button>
                            <button type="button" onClick={function () { onMenu("clear-sort"); }}>이 열 정렬 해제</button>
                            <button type="button" onClick={function () { onMenu("hide"); }}>열 숨기기</button>
                            <button type="button" onClick={function () { onMenu("pin"); }}>{layout.pinned[menu.payload.dataIndex] ? "고정 해제" : "왼쪽 고정"}</button>
                            <button type="button" onClick={function () { onMenu("fit"); }}>너비 맞춤</button>
                            <button type="button" onClick={function () { onMenu("reset-width"); }}>너비 초기화</button>
                        </div>
                    ) : null}
                    {menu.kind === "row" ? <button type="button" onClick={function () { onMenu("open"); }}>열기</button> : null}
                    {menu.kind === "columns" ? prepared.visible.concat(prepared.hidden).map(function (column) {
                        return <button key={column.dataIndex} type="button" onClick={function () { persist(toggleFlag(layout, column.dataIndex, "hidden")); }}>{layout.hidden[column.dataIndex] ? "보이기" : "숨기기"} {column.text}</button>;
                    }) : null}
                </div>
            ) : null}
        </div>
    );
}
