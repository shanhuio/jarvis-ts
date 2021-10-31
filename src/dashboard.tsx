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
import * as appcore from '@shanhuio/misc/dist/appcore'
import * as apppage from '@shanhuio/misc/dist/apppage'

import * as dashpassword from './dashpassword'
import * as state from './state'
import * as dashseclogs from './dashseclogs'
import * as dashcore from './dashcore'
import * as dash2fa from './dash2fa'
import * as dashsshkeys from './dashsshkeys'
import * as dashoverview from './dashoverview'

class Page {
    page: apppage.Page
    core: dashcore.Core

    constructor(core: dashcore.Core, page: apppage.Page) {
        this.page = page
        this.core = core
    }

    enter(path: string, pageData: any): apppage.Meta {
        this.core.redraw()
        if (pageData) {
            let d = pageData as dashcore.PageData
            if (d.NeedSudo) {
                let redirect = '/confirm-password?redirect=' +
                    encodeURIComponent('/' + d.Path)
                window.location.replace(redirect)
                return { title: 'Redirecting...' }
            }
        }
        return this.page.enter(path, pageData)
    }

    render() { return this.page.render() }
    exit() { return this.page.exit() }
}

class Dashboard  {
    core: appcore.Core
    dashCore: dashcore.Core

    // Cannot call this state as it is used by React.Component.
    loading: boolean = false
    viewState: state.State

    overview: Page
    changePassword: Page
    securityLogs: Page
    twofa: Page
    twofaEnableTotp: Page
    twofaDisableTotp: Page
    sshKeys: Page

    constructor(r: redraw.Redraw, data: dashcore.PageData) {
        // init states
        this.loading = false

        let s = new apppage.Switcher({ handler: this }, data.Path)
        this.core = appcore.makeWithSwitch(r, s)
        this.dashCore = new dashcore.Core(this.core)
        let c = this.dashCore

        // build views
        this.overview = new Page(c, new dashoverview.Page(c))
        this.changePassword = new Page(c, new dashpassword.ChangePage(c))
        this.securityLogs = new Page(c, new dashseclogs.Page(c))
        this.twofa = new Page(c, new dash2fa.Page(c))
        this.twofaEnableTotp = new Page(c, new dash2fa.EnableTotpPage(c))
        this.twofaDisableTotp = new Page(c, new dash2fa.DisableTotpPage(c))
        this.sshKeys = new Page(c, new dashsshkeys.Page(c))

        s.init(data)
    }

    redraw() { this.core.redraw() }

    handle(path: string): apppage.Page {
        if (path == 'overview') return this.overview
        if (path == 'change-password') return this.changePassword
        if (path == 'security-logs') return this.securityLogs
        if (path == 'ssh-keys') return this.sshKeys
        if (path == '2fa') return this.twofa
        if (path == '2fa/enable-totp') return this.twofaEnableTotp
        if (path == '2fa/disable-totp') return this.twofaDisableTotp
        return this.overview
    }

    render(): JSX.Element {
        let tabs = [
            { name: 'ssh-keys', text: 'Authorized SSH Keys' },
            { name: 'security-logs', text: 'Security Logs' },
            { name: 'change-password', text: 'Change Password' },
            { name: '2fa', text: 'Two-Factor Authentication' },
        ]
        let tabLinks: JSX.Element[] = []
        for (let tab of tabs) {
            let url = '/' + tab.name
            let onClick = this.dashCore.onClickGoto(tab.name)
            tabLinks.push(<li>
                <a href={url} onClick={onClick}>{tab.text}</a>
            </li>)
        }

        let links = <ol className="links">{tabLinks}</ol>

        let onClickLogo = this.dashCore.onClickGoto('overview')

        return <React.Fragment>
            <div className="topbar">
                <span className="logo">
                    <a href="/overview" onClick={onClickLogo}>
                        <img className="logo" src='/img/logo-white.png' />
                    </a>
                </span>
                <a href="/overview" onClick={onClickLogo}>HomeDrive</a>
                <span className="right">
                    <span className="part">
                        <a href="/signout">Sign Out</a>
                    </span>
                </span>
            </div>
            <div className="menu">{links}</div>
            <div className="view">{this.core.switcher.page().render()}</div>
        </React.Fragment>
    }
}

interface Props {
    data: dashcore.PageData
}

class Main extends React.Component<Props, {}> {
    redraw: redraw.Redraw
    dashboard: Dashboard

    constructor(props: Props) {
        super(props)
        this.redraw = redraw.NewRedraw(this)
        this.dashboard = new Dashboard(this.redraw, props.data)
    }
}

export function main(data: dashcore.PageData) {
    render.mainElement(<Main data={data}></Main>)
}
