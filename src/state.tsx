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

export class State {
    tab: string
    sub: string
    titleString: string
    noData: boolean

    constructor(tab: string, sub: string, title: string) {
        this.tab = tab
        this.sub = sub
        this.titleString = title
        this.noData = false
    }

    needQuery(): boolean { return !this.noData }
    url() { return '/' + this.encode() }
    pageTitle() { return this.title + ' - HomeDrive' }
    title(): string { return this.titleString }
    encode(): string {
        let path = this.sub ? ('/' + this.sub) : ''
        return this.tab + path
    }
}

export function make(tab: string, sub: string): State {
    switch (tab) {
        case 'change-password':
            let s = new State(tab, sub, 'Change Password')
            s.noData = true
            return s
        case '2fa':
            return new State(tab, sub, 'Two-Factor Authentication')
        case 'security-logs':
            return new State(tab, sub, 'Security Logs')
        case 'ssh-keys':
            return new State(tab, sub, 'Authorized SSH Keys')
    }
    return new State('overview', '', 'Overview')
}

export function parse(state: string): State {
    let s = state.indexOf('/')
    if (s >= 0) {
        return make(state.substr(0, s), state.substr(s + 1))
    }
    // Root tab. There is no sub path.
    return make(state, '')
}

export function title(state: string) {
    let s = parse(state)
    return s.pageTitle()
}
