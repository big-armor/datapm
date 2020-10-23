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
                            <p className="footer-title">about</p> <p className="footer-subtitle">documentation</p>{" "}
                            <p className="footer-subtitle">contact</p>{" "}
                        </div>{" "}
                        <div className="second-row">
                            {" "}
                            <p className="footer-title">terms and policies</p>{" "}
                            <p className="footer-subtitle">terms of use</p>{" "}
                            <p className="footer-subtitle">privacy policy</p>{" "}
                        </div>{" "}
                    </div>
                </section>
            </footer>
        );
    }
}

module.exports = Footer;
