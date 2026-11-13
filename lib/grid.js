/*
 * DataGridView와 TreeDocument가 주고받는 계약만 남긴 모델이다.
 * 노드는 label과 children, 열 값은 grid다. dataIndex가 "tree"이면 label을 읽는다.
 * sortModel 항목은 { dataIndex, sort }이고 sort는 "asc" 또는 "desc"다.
 * 이 파일에는 Vue, React, Next가 없다. 세 앱이 같은 내용을 두고, 나중에 패키지 하나로 뺄 수 있다.
 * 화면은 components/DataGrid.js가 그린다. Vue는 DataGrid.vue, React는 DataGrid.jsx다.
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
    function walk(nodes, depth) {
        ordered(nodes || [], sortModel).forEach(function (node) {
            var children = node.children || [];
            var hasChildren = children.length > 0;
            var isOpen = open[node.id] === true;
            result.push({
                id: node.id,
                depth: depth,
                node: node,
                hasChildren: hasChildren,
                expanded: isOpen,
            });
            if (hasChildren && isOpen) walk(children, depth + 1);
        });
    }
    walk(rows || [], 0);
    return result;
}

export function nextSort(sortModel, dataIndex) {
    var current = (sortModel || []).filter(function (item) {
        return item.dataIndex === dataIndex;
    })[0];
    if (!current || current.sort === "desc") return [{ dataIndex: dataIndex, sort: "asc" }];
    return [{ dataIndex: dataIndex, sort: "desc" }];
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
