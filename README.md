# ENXBoardNext

같은 게시판의 Next.js 14 페이지다. JSX는 Next가 컴파일하고, 화면 상태는 `useState`다. 글 저장 코드는 AMD 모듈을 가져오지 않고 `lib/data.js`에 있다. Next 빌드는 `require`를 실행하지 않기 때문이다.

아이콘 CSS와 글꼴은 `public/core`에 있다. 개발 서버와 정적 내보내기 모두 `/core/wux-3ds-fonticons.css`로 읽는다. `basePath`는 없다. 미리보기 주소는 서버 루트다.

## StackBlitz

https://stackblitz.com/fork/github/jrimchoi/enxboard-next

`npm install` 뒤 `npm run dev`가 실행된다. 미리보기는 `/`다.

## 로컬

```text
npm install
npm run dev
```

정적 파일로 만들려면 `npm run build`다. 결과 `out/`을 사이트 루트로 열면 된다.

| 경로 | 역할 |
|---|---|
| `pages/index.js` | 페이지. `useEffect`에서 컨트롤러를 만든다 |
| `components/Board.js` | JSX 화면 |
| `lib/controller.js` | 명령 |
| `lib/data.js` | 글 모델, 목록, 저장 |
| `lib/widget.js` | 대시보드 위젯 연결 |
| `public/data/posts.json` | 목 데이터 |
| `public/core` | 아이콘 CSS와 글꼴 |
| `styles/board.css` | 화면 골격. `pages/_app.js`가 번들로 넣는다 |
