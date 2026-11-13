/*
 * Next용 DataGridView다. JSX는 Next가 페이지 번들로 넣고, 트리·정렬·선택 계산은 lib/grid.js가 한다.
 * Vue는 DataGrid.vue, React는 DataGrid.jsx다. 모델 계산은 세 파일이 같다.
 */
import { useState } from "react";
import { cellValue, nextSort, selectedNodes, toggleSelection, visibleRows } from "../lib/grid";

export function DataGrid(props) {
    var rows = props.rows || [];
    var columns = props.columns || [];
    var sortModel = props.sortModel || [];
    var rowSelection = props.rowSelection || "single";
    var expandedState = useState({});
    var expanded = expandedState[0];
    var setExpanded = expandedState[1];
    var selectedState = useState({});
    var selected = selectedState[0];
    var setSelected = selectedState[1];
    var viewRows = visibleRows(rows, sortModel, expanded);

    function sortMark(column) {
        var current = sortModel.filter(function (item) {
            return item.dataIndex === column.dataIndex;
        })[0];
        if (!current) return "";
        return current.sort === "desc" ? "내림차순" : "오름차순";
    }

    function publishSelection(nextSelected) {
        setSelected(nextSelected);
        if (props.onSelect) props.onSelect(selectedNodes(rows, nextSelected));
    }

    return (
        <table className="enx-grid">
            <thead>
                <tr>
                    {props.showSelectionCheckBoxesFlag ? <th></th> : null}
                    {columns.map(function (column) {
                        return (
                            <th key={column.dataIndex}>
                                <button
                                    type="button"
                                    className="header"
                                    onClick={function () {
                                        if (column.sortableFlag === false) return;
                                        if (props.onSort) props.onSort(nextSort(sortModel, column.dataIndex));
                                    }}
                                >
                                    {column.text}
                                    {sortMark(column) ? <span className="sort">{sortMark(column)}</span> : null}
                                </button>
                            </th>
                        );
                    })}
                </tr>
            </thead>
            <tbody>
                {viewRows.length ? (
                    viewRows.map(function (row) {
                        return (
                            <tr
                                key={row.id}
                                className={selected[row.id] ? "selected" : undefined}
                                onClick={function () {
                                    publishSelection(toggleSelection(selected, row.id, rowSelection));
                                }}
                            >
                                {props.showSelectionCheckBoxesFlag ? (
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={!!selected[row.id]}
                                            onClick={function (event) {
                                                event.stopPropagation();
                                                publishSelection(toggleSelection(selected, row.id, rowSelection));
                                            }}
                                            onChange={function () {}}
                                        />
                                    </td>
                                ) : null}
                                {columns.map(function (column) {
                                    var value = cellValue(column, row.node);
                                    if (column.dataIndex === "tree") {
                                        return (
                                            <td key={column.dataIndex}>
                                                <div className="tree-cell" style={{ paddingLeft: row.depth * 16 }}>
                                                    {row.hasChildren ? (
                                                        <button
                                                            type="button"
                                                            className={row.expanded ? "twist expanded" : "twist"}
                                                            aria-expanded={row.expanded ? "true" : "false"}
                                                            onClick={function (event) {
                                                                event.stopPropagation();
                                                                setExpanded(function (current) {
                                                                    var next = Object.assign({}, current);
                                                                    next[row.id] = !row.expanded;
                                                                    return next;
                                                                });
                                                            }}
                                                        >
                                                            <span className="mark" />
                                                        </button>
                                                    ) : (
                                                        <span className="twist-gap" />
                                                    )}
                                                    <button
                                                        type="button"
                                                        className="link"
                                                        onClick={function (event) {
                                                            event.stopPropagation();
                                                            if (typeof value.func === "function") value.func();
                                                            if (props.onActivate) props.onActivate({ node: row.node, column: column, value: value });
                                                        }}
                                                    >
                                                        {value.label}
                                                    </button>
                                                </div>
                                            </td>
                                        );
                                    }
                                    return (
                                        <td key={column.dataIndex}>
                                            {value.func ? (
                                                <button
                                                    type="button"
                                                    className="link"
                                                    onClick={function (event) {
                                                        event.stopPropagation();
                                                        value.func();
                                                        if (props.onActivate) props.onActivate({ node: row.node, column: column, value: value });
                                                    }}
                                                >
                                                    {value.label}
                                                </button>
                                            ) : (
                                                value.label
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })
                ) : (
                    <tr>
                        <td colSpan={columns.length + (props.showSelectionCheckBoxesFlag ? 1 : 0)} className="empty">
                            {props.emptyText || "표시할 행이 없습니다."}
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
    );
}
