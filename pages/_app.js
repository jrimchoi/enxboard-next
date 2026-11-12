import "../styles/board.css";

export default function App(props) {
    var Component = props.Component;
    var pageProps = props.pageProps;
    return <Component {...pageProps} />;
}
