import { matchesColumnFilter } from "./grid";

function Post(raw) {
    var source = raw || {};
    this.id = source.id || "";
    this.title = source.title || "";
    this.author = source.author || "";
    this.date = source.date || "";
    this.content = source.content || "";
    this.tags = Array.isArray(source.tags) ? source.tags.slice() : [];
    this.children = Array.isArray(source.children)
        ? source.children.map(function (child) {
              return child instanceof Post ? child : new Post(child);
          })
        : [];
}

Post.prototype.validate = function () {
    var errors = [];
    if (!String(this.title).trim()) {
        errors.push("제목을 입력하세요.");
    }
    if (!String(this.author).trim()) {
        errors.push("작성자를 입력하세요.");
    }
    if (!String(this.content).trim()) {
        errors.push("본문을 입력하세요.");
    }
    if (this.date && !/^\d{4}-\d{2}-\d{2}$/.test(this.date)) {
        errors.push("날짜는 YYYY-MM-DD 형식입니다.");
    }
    return { ok: errors.length === 0, errors: errors };
};

Post.prototype.toJSON = function () {
    return {
        id: this.id,
        title: String(this.title).trim(),
        author: String(this.author).trim(),
        date: this.date,
        content: String(this.content).trim(),
        tags: this.tags
            .map(function (tag) {
                return String(tag).trim();
            })
            .filter(Boolean),
        children: this.children.map(function (child) {
            return child.toJSON();
        }),
    };
};

function Collection(items) {
    this.items = (items || []).map(function (item) {
        return item instanceof Post ? item : new Post(item);
    });
}

Collection.prototype.add = function (post) {
    var model = post instanceof Post ? post : new Post(post);
    this.items.push(model);
    return model;
};

function walkPosts(items, visit) {
    (items || []).some(function (post) {
        if (visit(post)) return true;
        return walkPosts(post.children, visit);
    });
}

Collection.prototype.remove = function (id) {
    function walk(items) {
        var index = items.findIndex(function (post) {
            return post.id === id;
        });
        if (index >= 0) return items.splice(index, 1)[0];
        for (var i = 0; i < items.length; i += 1) {
            var removed = walk(items[i].children || []);
            if (removed) return removed;
        }
        return null;
    }
    return walk(this.items);
};

Collection.prototype.findById = function (id) {
    var found = null;
    walkPosts(this.items, function (post) {
        if (post.id !== id) return false;
        found = post;
        return true;
    });
    return found;
};

function textOf(post) {
    return [post.title, post.author, post.content, (post.tags || []).join(" ")].join(" ").toLowerCase();
}

function activeFilters(filters) {
    return Object.keys(filters || {}).filter(function (key) {
        return String(filters[key] || "").trim();
    });
}

function passesFilters(post, filters) {
    var keys = activeFilters(filters);
    for (var index = 0; index < keys.length; index += 1) {
        var key = keys[index];
        var value = key === "tree" ? post.title : key === "tags" ? (post.tags || []).join(", ") : post[key];
        if (!matchesColumnFilter(value, filters[key], key === "date" ? "date" : "string")) return false;
    }
    return true;
}

function keepMatch(post, needle, filters) {
    if (!needle && !activeFilters(filters).length) return post.toJSON();
    var children = (post.children || [])
        .map(function (child) {
            return keepMatch(child, needle, filters);
        })
        .filter(Boolean);
    if ((!needle || textOf(post).indexOf(needle) !== -1) && passesFilters(post, filters)) return post.toJSON();
    if (!children.length) return null;
    var copy = post.toJSON();
    copy.children = children;
    return copy;
}

function comparePosts(left, right, sortModel) {
    var model = sortModel && sortModel.length ? sortModel : [{ dataIndex: "date", sort: "desc" }];
    for (var index = 0; index < model.length; index += 1) {
        var key = model[index].dataIndex === "tree" ? "title" : model[index].dataIndex;
        var lv = key === "tags" ? (left.tags || []).join(", ") : String(left[key] || "");
        var rv = key === "tags" ? (right.tags || []).join(", ") : String(right[key] || "");
        if (lv === rv) continue;
        var order = lv < rv ? -1 : 1;
        return model[index].sort === "desc" ? -order : order;
    }
    return 0;
}

function sortPosts(posts, sortModel) {
    return (posts || [])
        .map(function (post) {
            var copy = Object.assign({}, post);
            copy.tags = (post.tags || []).slice();
            copy.children = sortPosts(post.children || [], sortModel);
            return copy;
        })
        .sort(function (left, right) {
            return comparePosts(left, right, sortModel);
        });
}

Collection.prototype.getPage = function (page, pageSize, query, sortModel, filters) {
    var size = pageSize > 0 ? pageSize : 5;
    var needle = String(query || "").trim().toLowerCase();
    var matched = this.items
        .map(function (post) {
            return keepMatch(post, needle, filters);
        })
        .filter(Boolean);
    matched = sortPosts(matched, sortModel);
    var total = matched.length;
    var pageCount = Math.max(1, Math.ceil(total / size));
    var current = Math.min(Math.max(page || 1, 1), pageCount);
    var start = (current - 1) * size;
    return {
        items: matched.slice(start, start + size),
        page: current,
        pageSize: size,
        total: total,
        pageCount: pageCount,
    };
};

function Data() {
    this.collection = new Collection([]);
    this.ready = false;
}

Data.prototype.load = function (source) {
    var self = this;
    var incoming = Array.isArray(source)
        ? Promise.resolve(source)
        : fetch(source || "data/posts.json").then(function (response) {
              if (!response.ok) {
                  throw new Error("목 데이터를 읽지 못했습니다.");
              }
              return response.json();
          });
    return incoming.then(function (rows) {
        self.collection = new Collection(rows);
        self.ready = true;
        return self.collection.items.length;
    });
};

Data.prototype.fetchList = function (options) {
    var query = options || {};
    return Promise.resolve(this.collection.getPage(query.page, query.pageSize, query.query, query.sortModel, query.filters));
};

Data.prototype.fetchDetail = function (id) {
    var post = this.collection.findById(id);
    if (!post) {
        return Promise.reject(new Error("글을 찾지 못했습니다."));
    }
    return Promise.resolve(post.toJSON());
};

Data.prototype.createPost = function (raw) {
    var post = new Post(raw);
    post.id = this._nextId();
    if (!post.date) {
        post.date = new Date().toISOString().slice(0, 10);
    }
    var check = post.validate();
    if (!check.ok) {
        return Promise.reject(check);
    }
    this.collection.add(post);
    return Promise.resolve(post.toJSON());
};

Data.prototype.updatePost = function (id, raw) {
    var current = this.collection.findById(id);
    if (!current) {
        return Promise.reject(new Error("글을 찾지 못했습니다."));
    }
    var next = new Post({
        id: current.id,
        title: raw.title,
        author: raw.author,
        date: raw.date,
        content: raw.content,
        tags: Array.isArray(raw.tags) ? raw.tags : [],
    });
    var check = next.validate();
    if (!check.ok) {
        return Promise.reject(check);
    }
    current.title = next.title;
    current.author = next.author;
    current.date = next.date;
    current.content = next.content;
    current.tags = next.tags;
    return Promise.resolve(current.toJSON());
};

Data.prototype.deletePost = function (id) {
    var removed = this.collection.remove(id);
    if (!removed) {
        return Promise.reject(new Error("글을 찾지 못했습니다."));
    }
    return Promise.resolve(removed.toJSON());
};

Data.prototype.movePost = function (id, beforeId) {
    if (!id || !beforeId || id === beforeId) return false;
    function parentOf(list, target, parent) {
        for (var index = 0; index < (list || []).length; index += 1) {
            if (list[index].id === target) return parent || "";
            var below = parentOf(list[index].children, target, list[index].id);
            if (below !== null) return below;
        }
        return null;
    }
    var items = this.collection.items;
    if (parentOf(items, id, "") !== parentOf(items, beforeId, "")) return false;
    var removed = null;
    function strip(list) {
        var next = [];
        (list || []).forEach(function (post) {
            if (post.id === id) {
                removed = post;
                return;
            }
            post.children = strip(post.children);
            next.push(post);
        });
        return next;
    }
    function insert(list) {
        var index = (list || []).findIndex(function (post) {
            return post.id === beforeId;
        });
        if (index >= 0) {
            var next = list.slice();
            next.splice(index, 0, removed);
            return next;
        }
        return (list || []).map(function (post) {
            post.children = insert(post.children || []);
            return post;
        });
    }
    var stripped = strip(items);
    if (!removed) return false;
    this.collection.items = insert(stripped);
    return true;
};

Data.prototype._nextId = function () {
    var max = 0;
    walkPosts(this.collection.items, function (post) {
        var number = parseInt(String(post.id).replace(/\D/g, ""), 10);
        if (Number.isFinite(number)) max = Math.max(max, number);
        return false;
    });
    var next = String(max + 1);
    return "p" + next.padStart(2, "0");
};

export { Post, Collection, Data };
