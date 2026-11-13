import { DataGrid } from "./DataGrid";

var columns = [
    { text: "제목", dataIndex: "tree" },
    { text: "작성자", dataIndex: "author" },
    { text: "날짜", dataIndex: "date" },
    { text: "태그", dataIndex: "tags" },
];

function icon(name) {
    return <i className={"wux-ui-3ds wux-ui-3ds-" + name} aria-hidden="true" />;
}

function heading(state) {
    if (state.screen === "detail" && state.post) {
        return state.post.title;
    }
    if (state.screen === "create") {
        return "새 글";
    }
    if (state.screen === "edit") {
        return "글 수정";
    }
    return "게시판";
}

function readForm(form) {
    return {
        title: form.title.value,
        author: form.author.value,
        date: form.date.value,
        content: form.content.value,
        tags: form.tags.value,
    };
}

export function Board(props) {
    var state = props.state;
    var command = props.onCommand;
    var post = state.post || { title: "", author: "", date: "", content: "", tags: [] };
    var tags = Array.isArray(post.tags) ? post.tags.join(", ") : post.tags || "";

    return (
        <div>
            <header>
                <h1>
                    {icon("list")} {heading(state)}
                </h1>
            </header>
            {state.notice ? <p className="notice">{state.notice}</p> : null}
            {state.errors && state.errors.length ? (
                <ul className="errors">
                    {state.errors.map(function (error) {
                        return <li key={error}>{error}</li>;
                    })}
                </ul>
            ) : null}
            {!state.list && state.screen === "list" ? <p>게시판을 불러오는 중입니다.</p> : null}
            {state.screen === "list" && state.list ? (
                <>
                    <form
                        key={"search-" + state.query}
                        className="toolbar"
                        onSubmit={function (event) {
                            event.preventDefault();
                            command("search", { query: event.target.query.value });
                        }}
                    >
                        {icon("search")}
                        <input name="query" type="search" defaultValue={state.query} placeholder="제목, 작성자, 본문, 태그" />
                        <button type="submit">검색</button>
                        <button type="button" onClick={function () { command("create", {}); }}>
                            {icon("plus")} 새 글
                        </button>
                    </form>
                    <p className="count">
                        전체 {state.list.total}건, {state.list.page} / {state.list.pageCount}쪽
                    </p>
                    <div className="grid-host">
                        <DataGrid
                            rows={state.list.items}
                            columns={columns}
                            sortModel={state.sort}
                            rowSelection="single"
                            showSelectionCheckBoxesFlag
                            onSort={function (sortModel) { command("sort", { sortModel: sortModel }); }}
                            emptyText="검색 결과가 없습니다."
                            onActivate={function (event) { command("open", { id: event.node.id }); }}
                        />
                    </div>
                    <div className="pager">
                        <button type="button" disabled={state.list.page <= 1} onClick={function () { command("page", { page: state.list.page - 1 }); }}>
                            {icon("left")} 이전
                        </button>
                        <button
                            type="button"
                            disabled={state.list.page >= state.list.pageCount}
                            onClick={function () { command("page", { page: state.list.page + 1 }); }}
                        >
                            다음
                        </button>
                    </div>
                </>
            ) : null}
            {state.screen === "detail" && state.post ? (
                <>
                    <p className="meta">
                        {state.post.author} · {state.post.date}
                    </p>
                    <p>{state.post.tags.join(", ")}</p>
                    <article className="content">{state.post.content}</article>
                    <div className="actions">
                        <button type="button" onClick={function () { command("back", {}); }}>
                            {icon("left")} 목록
                        </button>
                        <button type="button" onClick={function () { command("edit", { id: state.post.id }); }}>
                            {icon("pencil")} 수정
                        </button>
                        <button type="button" onClick={function () { command("delete", { id: state.post.id }); }}>
                            {icon("trash")} 삭제
                        </button>
                    </div>
                </>
            ) : null}
            {state.screen === "create" || state.screen === "edit" ? (
                <form
                    key={state.screen + "-" + (post.id || "new")}
                    className="editor"
                    onSubmit={function (event) {
                        event.preventDefault();
                        command("save", { fields: readForm(event.target) });
                    }}
                >
                    <label>
                        제목
                        <input name="title" defaultValue={post.title} />
                    </label>
                    <label>
                        작성자
                        <input name="author" defaultValue={post.author} />
                    </label>
                    <label>
                        날짜
                        <input name="date" defaultValue={post.date} />
                    </label>
                    <label>
                        본문
                        <textarea name="content" rows={8} defaultValue={post.content} />
                    </label>
                    <label>
                        태그
                        <input name="tags" defaultValue={tags} />
                    </label>
                    <div className="actions">
                        <button type="button" onClick={function () { command("cancel", {}); }}>
                            {icon("left")} 취소
                        </button>
                        <button type="submit">{icon("check")} 저장</button>
                    </div>
                </form>
            ) : null}
        </div>
    );
}
