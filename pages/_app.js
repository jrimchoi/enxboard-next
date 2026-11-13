import "../styles/board.css";
import "../styles/grid.css";

export default function App(props) {
    var Component = props.Component;
    var pageProps = props.pageProps;
    return <Component {...pageProps} />;
}
