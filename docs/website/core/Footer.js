/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const React = require("react");

class Footer extends React.Component {
    docUrl(doc) {
        const baseUrl = this.props.config.baseUrl;
        const docsUrl = this.props.config.docsUrl;
        const docsPart = `${docsUrl ? `${docsUrl}/` : ""}`;
        return `${baseUrl}${docsPart}${doc}`;
    }

    render() {
        return (
            <footer className="nav-footer" id="footer">
                <section className="copyright">
                    <div className="footer-wrapper">
                        {" "}
                        <div className="first-row">
                            {" "}
                            <p className="footer-title">about</p> <p className="footer-subtitle"><a href="/docs">documentation</a></p>{" "}
                            <p className="footer-subtitle"><a href="/contact">contact</a></p>{" "}
                        </div>{" "}
                        <div className="second-row">
                            {" "}
                            <p className="footer-title">terms and policies</p>{" "}
                            <p className="footer-subtitle"><a href="/terms">terms of use</a></p>{" "}
                            <p className="footer-subtitle"><a href="/privacy">privacy policy</a></p>{" "}
                        </div>{" "}
                    </div>
                </section>
            </footer>
        );
    }
}

module.exports = Footer;
