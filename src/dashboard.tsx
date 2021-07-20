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

import * as redraw from '@shanhuio/misc/dist/redraw'
import * as render from '@shanhuio/misc/dist/render'
import * as tracker from '@shanhuio/misc/dist/tracker'
import * as appcore from '@shanhuio/misc/dist/appcore'

import * as password from './password'
import * as logs from './logs'
import * as twofa from './twofa'
import * as sshkeys from './sshkeys'
import * as state from './state'
import * as overview from './overview'

export class SecurityLogsData {
    Entries: logs.Entry[]
}

export class PageData {
    Tab: string
    Sub: string
    RequestID: number
    NeedSudo: boolean
    Now: number

    Overview: overview.Data
    TwoFactorAuth: twofa.Data
    SecurityLogs: SecurityLogsData
    SSHKeys: sshkeys.Data
}

class DataRequest {
    Tab: string
    Sub: string
    RequestID: number
}

interface Props {
    data: PageData
}

class App extends React.Component<Props, {}> {
    core: appcore.Core
    // Cannot call this state as it is used by React.Component.
    lastRequestID: number = 0
    loading: boolean = false
    data: PageData
    viewState: state.State

    changePassword: password.ChangeView
    securityLogs: logs.View
    twofa: twofa.View
    twofaEnableTotp: twofa.EnableTotpView
    twofaDisableTotp: twofa.DisableTotpView
    sshKeys: sshkeys.View

    constructor(props: Props) {
        super(props)

        // init states
        this.lastRequestID = 0
        this.loading = false
        let data = props.data

        // build core
        let r = redraw.NewRedraw(this)
        let t = new tracker.Tracker({
            stateFunc: (s: tracker.State) => {
                if (s instanceof state.State) {
                    this.enterState(s as state.State)
                    this.refresh()
                }
            },
            decodeFunc: state.parse,
        })
        this.core = appcore.make(r, t)

        // build views
        this.changePassword = new password.ChangeView(this.core)
        this.securityLogs = new logs.View(this.core, {
            title: 'Security Logs',
            data: () => {
                if (!this.data.SecurityLogs) { return null }
                return { entries: this.data.SecurityLogs.Entries }
            }
        })
        this.twofa = new twofa.View(this.core)
        this.twofaEnableTotp = new twofa.EnableTotpView(this.core)
        this.twofaDisableTotp = new twofa.DisableTotpView(this.core)
        this.sshKeys = new sshkeys.View(this.core)

        // enter init state and set data
        let initState = state.make(data.Tab, data.Sub)
        this.core.tracker.enterState(initState)
        this.enterState(initState)
        this.setData(initState, data)
    }

    redraw() { this.core.redraw() }

    enterState(s: state.State) {
        this.viewState = s
        switch (s.tab) {
            case 'change-password':
                this.changePassword.clear()
                break
            case '2fa':
                if (s.sub == 'enable-totp') {
                    this.twofaEnableTotp.clear()
                } else if (s.sub == 'disable-totp') {
                    this.twofaDisableTotp.clear()
                }
                break
        }
    }

    setData(state: state.State, data: PageData) {
        this.data = data
        if (data.NeedSudo) {
            let redirect = '/confirm-password?redirect=' +
                encodeURIComponent(state.url())
            window.location.replace(redirect)
            return
        }

        if (this.data.TwoFactorAuth) {
            if (this.data.Sub == 'enable-totp') {
                this.twofaEnableTotp.setData(this.data.TwoFactorAuth.TOTP)
            } else if (this.data.Sub == 'disable-totp') {
                this.twofaDisableTotp.setData(this.data.TwoFactorAuth.TOTP)
            } else {
                this.twofa.setData(this.data.TwoFactorAuth)
            }
        }
        if (this.data.SSHKeys) {
            this.sshKeys.setData(this.data.SSHKeys)
        }
    }

    makeSwitch(nextState: string) {
        return (ev: React.SyntheticEvent) => {
            ev.preventDefault()
            this.core.goto(state.parse(nextState))
        }
    }

    refresh() {
        let state = this.viewState
        this.lastRequestID += 1
        if (state.needQuery()) {
            let req = new DataRequest()
            req.Tab = state.tab
            req.Sub = state.sub
            this.loading = true
            req.RequestID = this.lastRequestID

            this.core.call('/api/dashboard/data', req, {
                success: (d: any, status: string, xhr: JQueryXHR) => {
                    let pageData = d as PageData
                    if (pageData.RequestID != this.lastRequestID) {
                        return
                    }
                    this.loading = false

                    this.setData(state, pageData)
                    this.redraw()
                },
                error: (xhr: JQueryXHR, status: string, err: string) => {
                    // TODO(h8liu): proper error handling
                    console.log(status, err)
                },
            })
        }

        this.redraw()
    }

    renderView(): JSX.Element {
        let now = this.data.Now
        switch (this.viewState.tab) {
            case 'change-password':
                return this.changePassword.render()
            case 'security-logs':
                return this.securityLogs.render(now)
            case '2fa':
                if (this.viewState.sub == 'enable-totp') {
                    return this.twofaEnableTotp.render()
                } else if (this.viewState.sub == 'disable-totp') {
                    return this.twofaDisableTotp.render()
                }
                return this.twofa.render()
            case 'ssh-keys':
                return this.sshKeys.render()
            default:
                return overview.render(this.data.Overview)
        }
    }

    render(): JSX.Element {
        let tabs = [
            { name: 'ssh-keys', 'text': 'Authorized SSH Keys' },
            { name: 'security-logs', text: 'Security Logs' },
            { name: 'change-password', text: 'Change Password' },
            { name: '2fa', text: 'Two-Factor Authentication' },
        ]
        let tabLinks: JSX.Element[] = []
        for (let tab of tabs) {
            let url = '/' + tab.name
            let onClick = this.makeSwitch(tab.name)
            tabLinks.push(<li>
                <a href={url} onClick={onClick}>{tab.text}</a>
            </li>)
        }

        let links = <ol className="links">
            {tabLinks}
        </ol>

        return <div>
            <div className="topbar">
                <span className="logo">
                    <a href="/overview" onClick={this.makeSwitch('overview')}>
                        <img className="logo" src='/img/logo-white.png' />
                    </a>
                </span>
                <a href="/overview" onClick={this.makeSwitch('overview')}>
                    HomeDrive
                </a>
                <span className="right">
                    <span className="part">
                        <a href="/signout">Sign Out</a>
                    </span>
                </span>
            </div>
            <div className="menu">
                {links}
            </div>
            <div className="view">{this.renderView()}</div>
        </div>
    }
}

export function main(data: PageData) {
    render.mainElement(<App data={data}></App>)
}
