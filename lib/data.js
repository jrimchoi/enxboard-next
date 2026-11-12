function Post(raw) {
    var source = raw || {};
    this.id = source.id || "";
    this.title = source.title || "";
    this.author = source.author || "";
    this.date = source.date || "";
    this.content = source.content || "";
    this.tags = Array.isArray(source.tags) ? source.tags.slice() : [];
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

Collection.prototype.remove = function (id) {
    var index = this.items.findIndex(function (post) {
        return post.id === id;
    });
    if (index < 0) {
        return null;
    }
    return this.items.splice(index, 1)[0];
};

Collection.prototype.findById = function (id) {
    return (
        this.items.find(function (post) {
            return post.id === id;
        }) || null
    );
};

Collection.prototype.getPage = function (page, pageSize, query) {
    var size = pageSize > 0 ? pageSize : 5;
    var needle = String(query || "").trim().toLowerCase();
    var matched = this.items.filter(function (post) {
        if (!needle) {
            return true;
        }
        var haystack = [post.title, post.author, post.content, post.tags.join(" ")].join(" ").toLowerCase();
        return haystack.indexOf(needle) !== -1;
    });
    matched.sort(function (left, right) {
        if (left.date === right.date) {
            return right.id < left.id ? -1 : 1;
        }
        return right.date < left.date ? -1 : 1;
    });
    var total = matched.length;
    var pageCount = Math.max(1, Math.ceil(total / size));
    var current = Math.min(Math.max(page || 1, 1), pageCount);
    var start = (current - 1) * size;
    return {
        items: matched.slice(start, start + size).map(function (post) {
            return post.toJSON();
        }),
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
    return Promise.resolve(this.collection.getPage(query.page, query.pageSize, query.query));
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

Data.prototype._nextId = function () {
    var max = this.collection.items.reduce(function (highest, post) {
        var number = parseInt(String(post.id).replace(/\D/g, ""), 10);
        return Number.isFinite(number) ? Math.max(highest, number) : highest;
    }, 0);
    var next = String(max + 1);
    return "p" + next.padStart(2, "0");
};

export { Post, Collection, Data };
