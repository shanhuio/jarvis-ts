// Copyright (C) 2021  Shanhu Tech Inc.
//
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU Affero General Public License as published by the
// Free Software Foundation, either version 3 of the License, or (at your
// option) any later version.
//
// This program is distributed in the hope that it will be useful, but WITHOUT
// ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
// FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License
// for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import * as React from 'react' // for tsx

import * as appcore from '@shanhuio/misc/dist/appcore'

import * as state from './state'

export class TOTPSetup {
    SignedSecret: string
    QRCode: string
    URL: string
}

export class TOTPData {
    Enabled: boolean
    TOTPSetup: TOTPSetup
}

export class Data {
    TOTP: TOTPData
}

function sanityCheckOTP(code: string) {
    // Out OTP is explicitly configured to be 6 digits on the server side.
    if (!code) { return 'OTP is empty.' }
    if (!(code.length == 6 && /^\d+$/.test(code))) {
        return 'OTP should be a 6-digit number.'
    }
    return ''
}

export class EnableTotpView {
    core: appcore.Core

    enabled: boolean
    signedSecret: string = ''
    qr: string = ''
    errorMsg: string
    otp: string
    show: boolean = false

    constructor(core: appcore.Core) {
        this.core = core
    }

    redraw() { this.core.redraw() }

    setData(d: TOTPData) {
        this.show = true
        this.enabled = d.Enabled
        this.errorMsg = ''
        if (this.enabled) {
            this.signedSecret = ''
            this.qr = ''
        } else {
            this.signedSecret = d.TOTPSetup.SignedSecret
            this.qr = d.TOTPSetup.QRCode
        }
    }

    clear() { this.show = false }

    submit() {
        this.errorMsg = sanityCheckOTP(this.otp)
        this.redraw()
        if (this.errorMsg) { return }

        this.core.caller.call('/api/totp/enable', {
            SignedSecret: this.signedSecret,
            OTP: this.otp,
        }, {
            success: (resp: any, status: string, xhr: JQueryXHR) => {
                let msg = resp as { Error: string }
                if (msg.Error) {
                    this.errorMsg = msg.Error
                    this.redraw()
                    return
                }
                this.core.tracker.goto(state.parse('2fa'))
            },
            error: (xhr: JQueryXHR, status: string, err: string) => {
                this.errorMsg = 'Failed to enable TOTP: ' + xhr.responseText
                this.redraw()
            },
        })
    }

    renderError(): JSX.Element {
        if (!this.errorMsg) { return null }
        return <div className="error">
            <span className="error">{this.errorMsg}</span>
        </div>
    }

    render(): JSX.Element {
        if (!this.show) { return null }
        if (this.enabled) {
            return <div className="activate">
                TOTP already enabled.
            </div>
        }

        let onSubmit = (ev: React.FormEvent<HTMLElement>) => {
            ev.preventDefault()
            this.submit()
        }
        let onChange = (ev: React.FormEvent<HTMLInputElement>) => {
            this.otp = ev.currentTarget.value
        }
        let form = <form className="activate" onSubmit={onSubmit}>
            <div className="line">
                Open your TOTP Authentication App and
                scan the following QRCode:
            </div>
            <div className="qr"><img src={this.qr}></img></div>
            <div className="line">
                Enter the 6-digit code from your app:
            </div>
            <div className="line otp">
                <input type="text" onChange={onChange} />
            </div>
            {this.renderError()}
            <div className="submit">
                <input className="green-submit" type="submit"
                    value="Activate" />
            </div>
        </form>
        return <div className="two-factor">
            <h2>Enable TOTP</h2>
            {form}
        </div>
    }
}

export class DisableTotpView {
    core: appcore.Core
    errorMsg: string = ''
    show: boolean = false
    enabled: boolean

    constructor(core: appcore.Core) {
        this.core = core
    }

    clear() {
        this.show = false
        this.errorMsg = ''
    }

    setData(d: TOTPData) {
        this.show = true
        this.enabled = d.Enabled
    }

    redraw() { this.core.redraw() }

    submit() {
        this.core.caller.call(
            '/api/totp/disable', {}, {
            success: (resp: any, status: string, xhr: JQueryXHR) => {
                this.core.tracker.goto(state.parse('2fa'))
            },
            error: (xhr: JQueryXHR, status: string, err: string) => {
                this.errorMsg = 'Failed to disable TOTP: ' + xhr.responseText
                this.redraw()
            },
        })
    }

    renderError(): JSX.Element {
        if (!this.errorMsg) { return null }
        return <div className="error">
            <span className="error">{this.errorMsg}</span>
        </div>
    }

    render() {
        if (!this.show) { return null }
        let onClickGoBack = (ev: React.MouseEvent) => {
            ev.preventDefault()
            this.core.tracker.goto(state.parse('2fa'))
        }

        if (!this.enabled) {
            return <div>
                <h2>Disable TOTP</h2>
                <p>TOTP is already disabled.</p>
                <div className="buttons">
                    <a href="/2fa" onClick={onClickGoBack}>
                        <span className="button-gray">Go back</span>
                    </a>
                </div>
            </div>
        }

        let onClickDisableConfirm = (ev: React.MouseEvent) => {
            ev.preventDefault()
            this.submit()
        }
        return <div className="two-factor">
            <h2>Disable TOTP</h2>
            <p>
                OTP authentication defends you from credential phishing
                and brute-force attacks. Are you sure you want to disable it?
            </p>
            <div className="buttons">
                <a href="/2fa" onClick={onClickGoBack}>
                    <span className="button-gray">Go back</span>
                </a>
                <a href="#" onClick={onClickDisableConfirm}>
                    <span className="button-red">Disable</span>
                </a>
            </div>
            {this.renderError()}
        </div>
    }
}

export class View {
    core: appcore.Core

    totpEnabled: boolean = false

    constructor(core: appcore.Core) {
        this.core = core
    }

    redraw() { this.core.redraw() }

    setData(d: Data) {
        if (d.TOTP) { this.setTotpData(d.TOTP) }
    }

    setTotpData(d: TOTPData) {
        this.totpEnabled = d.Enabled
        this.redraw()
    }

    renderEnableButton(): JSX.Element {
        let onClickEnable = (ev: React.FormEvent<HTMLElement>) => {
            ev.preventDefault()
            this.core.tracker.goto(state.parse('2fa/enable-totp'))
        }
        return <a href="/2fa/enable-totp" onClick={onClickEnable}>
            <span className="button-green">Enable TOTP</span>
        </a>
    }

    renderDisableButton(): JSX.Element {
        let onDisable = (ev: React.FormEvent<HTMLElement>) => {
            ev.preventDefault()
            this.core.tracker.goto(state.parse('2fa/disable-totp'))
        }
        return <a href="/2fa/disable-totp" onClick={onDisable}>
            <span className="button-danger">Disable TOTP</span>
        </a>
    }

    renderState(): JSX.Element {
        if (this.totpEnabled) {
            return <div>
                <p>TOTP authentication is enabled.</p>
                {this.renderDisableButton()}
            </div>
        }
        return <div>
            <p>TOTP authentication is not enabled.</p>
            {this.renderEnableButton()}
        </div>
    }

    render(): JSX.Element {
        return <div className="two-factor">
            <h2>Two-Factor Authentication</h2>
            {this.renderState()}
        </div>
    }
}
