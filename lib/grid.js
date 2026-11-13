/*
 * DataGridView와 TreeDocument가 주고받는 계약만 남긴 모델이다.
 * 노드는 label과 children, 열 값은 grid다. dataIndex가 "tree"이면 label을 읽는다.
 * sortModel 항목은 { dataIndex, sort }이고 sort는 "asc" 또는 "desc"다.
 * 이 파일에는 Vue, React, Next가 없다. 세 앱이 같은 내용을 두고, 나중에 패키지 하나로 뺄 수 있다.
 * 화면은 DataGrid.vue, DataGrid.jsx, components/DataGrid.js가 각자 그린다.
 */

export function nodeLabel(node) {
    if (!node) return "";
    if (node.label != null && node.label !== "") return String(node.label);
    if (node.title != null) return String(node.title);
    return "";
}

export function nodeField(node, dataIndex) {
    if (dataIndex === "tree") return nodeLabel(node);
    var source = node && node.grid ? node.grid : node || {};
    var value = source[dataIndex];
    if (Array.isArray(value)) return value.join(", ");
    if (value && typeof value === "object" && value.label != null) return String(value.label);
    return value == null ? "" : String(value);
}

export function cellValue(column, node) {
    if (column && typeof column.getCellValue === "function") {
        var custom = column.getCellValue({
            nodeModel: {
                options: {
                    label: nodeLabel(node),
                    grid: node && node.grid ? node.grid : node || {},
                },
            },
        });
        if (custom && typeof custom === "object") return custom;
        return { label: custom == null ? "" : String(custom) };
    }
    return { label: nodeField(node, column ? column.dataIndex : "tree") };
}

function compareNodes(left, right, sortModel) {
    var model = sortModel || [];
    for (var index = 0; index < model.length; index += 1) {
        var item = model[index];
        var lv = nodeField(left, item.dataIndex);
        var rv = nodeField(right, item.dataIndex);
        if (lv === rv) continue;
        var order = lv < rv ? -1 : 1;
        return item.sort === "desc" ? -order : order;
    }
    return 0;
}

function ordered(nodes, sortModel) {
    return nodes.slice().sort(function (left, right) {
        return compareNodes(left, right, sortModel);
    });
}

export function visibleRows(rows, sortModel, expanded) {
    var open = expanded || {};
    var result = [];
    function walk(nodes, depth, parentId) {
        ordered(nodes || [], sortModel).forEach(function (node) {
            var children = node.children || [];
            var hasChildren = children.length > 0;
            var isOpen = open[node.id] === true;
            result.push({
                id: node.id,
                depth: depth,
                parentId: parentId || "",
                node: node,
                hasChildren: hasChildren,
                expanded: isOpen,
            });
            if (hasChildren && isOpen) walk(children, depth + 1, node.id);
        });
    }
    walk(rows || [], 0, "");
    return result;
}

export function nextSort(sortModel, dataIndex, additive) {
    var model = sortModel || [];
    var current = model.filter(function (item) {
        return item.dataIndex === dataIndex;
    })[0];
    if (!additive) {
        if (!current || current.sort === "desc") return [{ dataIndex: dataIndex, sort: "asc" }];
        return [{ dataIndex: dataIndex, sort: "desc" }];
    }
    var rest = model.filter(function (item) {
        return item.dataIndex !== dataIndex;
    });
    if (!current) return rest.concat([{ dataIndex: dataIndex, sort: "asc" }]);
    if (current.sort === "asc") return rest.concat([{ dataIndex: dataIndex, sort: "desc" }]);
    return rest;
}

export function matchesColumnFilter(value, filter, typeRepresentation) {
    var expect = String(filter || "").trim();
    if (!expect) return true;
    var actual = String(value || "");
    if (typeRepresentation === "number") {
        var number = parseFloat(actual);
        var op = expect.match(/^(>=|<=|>|<|=)\s*(-?\d+(?:\.\d+)?)$/);
        if (op && Number.isFinite(number)) {
            var target = parseFloat(op[2]);
            if (op[1] === ">") return number > target;
            if (op[1] === "<") return number < target;
            if (op[1] === ">=") return number >= target;
            if (op[1] === "<=") return number <= target;
            return number === target;
        }
    }
    return actual.toLowerCase().indexOf(expect.toLowerCase()) !== -1;
}

export function emptyLayout() {
    return { order: [], widths: {}, hidden: {}, pinned: {} };
}

export function loadLayout(identifier) {
    if (!identifier || typeof localStorage === "undefined") return emptyLayout();
    try {
        var parsed = JSON.parse(localStorage.getItem("enx-grid:" + identifier) || "null");
        if (!parsed || typeof parsed !== "object") return emptyLayout();
        return {
            order: Array.isArray(parsed.order) ? parsed.order : [],
            widths: parsed.widths || {},
            hidden: parsed.hidden || {},
            pinned: parsed.pinned || {},
        };
    } catch (error) {
        return emptyLayout();
    }
}

export function saveLayout(identifier, layout) {
    if (!identifier || typeof localStorage === "undefined") return;
    localStorage.setItem("enx-grid:" + identifier, JSON.stringify(layout));
}

function cloneLayout(layout) {
    var source = layout || emptyLayout();
    return {
        order: (source.order || []).slice(),
        widths: Object.assign({}, source.widths),
        hidden: Object.assign({}, source.hidden),
        pinned: Object.assign({}, source.pinned),
    };
}

export function layoutColumns(columns, layout) {
    var source = columns || [];
    var known = {};
    source.forEach(function (column) {
        known[column.dataIndex] = column;
    });
    var order = (layout && layout.order ? layout.order : []).filter(function (id) {
        return known[id];
    });
    source.forEach(function (column) {
        if (order.indexOf(column.dataIndex) < 0) order.push(column.dataIndex);
    });
    var visible = [];
    var hidden = [];
    order.forEach(function (id) {
        var column = known[id];
        var view = {
            text: column.text,
            dataIndex: column.dataIndex,
            sortableFlag: column.sortableFlag,
            resizableFlag: column.resizableFlag !== false,
            editableFlag: column.editableFlag === true,
            typeRepresentation: column.typeRepresentation || (column.dataIndex === "date" ? "date" : "string"),
            width: layout && layout.widths && layout.widths[id] ? layout.widths[id] : column.width || 140,
            pinned: !!(layout && layout.pinned && layout.pinned[id]),
            getCellValue: column.getCellValue,
        };
        if ((layout && layout.hidden && layout.hidden[id]) || column.visibleFlag === false) hidden.push(view);
        else visible.push(view);
    });
    visible.sort(function (left, right) {
        if (left.pinned === right.pinned) return 0;
        return left.pinned ? -1 : 1;
    });
    return { visible: visible, hidden: hidden, order: order };
}

export function resizeColumn(layout, dataIndex, width) {
    var next = cloneLayout(layout);
    next.widths[dataIndex] = Math.max(50, Math.round(width));
    return next;
}

export function moveColumn(layout, order, dataIndex, beforeId) {
    var next = cloneLayout(layout);
    var list = (order || []).filter(function (id) {
        return id !== dataIndex;
    });
    var index = list.indexOf(beforeId);
    if (index < 0) list.push(dataIndex);
    else list.splice(index, 0, dataIndex);
    next.order = list;
    return next;
}

export function toggleFlag(layout, dataIndex, key) {
    var next = cloneLayout(layout);
    var bag = Object.assign({}, next[key]);
    if (bag[dataIndex]) delete bag[dataIndex];
    else bag[dataIndex] = true;
    next[key] = bag;
    return next;
}

export function estimateWidth(label, values) {
    var longest = String(label || "").length;
    (values || []).forEach(function (value) {
        longest = Math.max(longest, String(value || "").length);
    });
    return Math.min(480, Math.max(72, longest * 13 + 36));
}

export function selectRange(ids, anchorId, id) {
    var start = ids.indexOf(anchorId);
    var end = ids.indexOf(id);
    var next = {};
    if (start < 0 || end < 0) {
        next[id] = true;
        return next;
    }
    var from = Math.min(start, end);
    var to = Math.max(start, end);
    for (var index = from; index <= to; index += 1) next[ids[index]] = true;
    return next;
}

export function findNode(rows, id) {
    var found = null;
    function walk(nodes) {
        (nodes || []).forEach(function (node) {
            if (found) return;
            if (node.id === id) found = node;
            else walk(node.children);
        });
    }
    walk(rows);
    return found;
}

export function selectedNodes(rows, selected) {
    var marks = selected || {};
    var found = [];
    function walk(nodes) {
        (nodes || []).forEach(function (node) {
            if (marks[node.id]) found.push(node);
            walk(node.children);
        });
    }
    walk(rows);
    return found;
}

export function toggleSelection(selected, id, mode) {
    var current = selected || {};
    if (mode === "none") return {};
    if (mode === "multiple") {
        var next = Object.assign({}, current);
        if (next[id]) delete next[id];
        else next[id] = true;
        return next;
    }
    return current[id] ? {} : { [id]: true };
}
