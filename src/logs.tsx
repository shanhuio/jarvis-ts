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

import * as moment from '@shanhuio/misc/dist/moment'
import * as appcore from '@shanhuio/misc/dist/appcore'

export class Entry {
    K: string
    TSec: number
    User: string
    Text: string
    Type: string
    Vstr: string
}

export class ViewData {
    entries: Entry[]
}

export class ViewConfig {
    title: string
    data: () => (ViewData)
}

export class View {
    config: ViewConfig

    constructor(_: appcore.Core, config: ViewConfig) {
        this.config = config
    }

    renderList(data: ViewData, now: number) {
        if (!data || !data.entries) {
            return <div className="empty">No entries.</div>
        }

        let rows: JSX.Element[] = []
        for (let entry of data.entries) {
            rows.push(<tr>
                <td>{moment.longFormat(now, entry.TSec)}</td>
                <td>{entry.Text}</td>
            </tr>)
        }

        return <table className="logs" cellPadding="0" cellSpacing="0">
            {rows}
        </table>
    }

    render(now: number): JSX.Element {
        let data = this.config.data()

        return <div className="logs">
            <h2>{this.config.title}</h2>
            {this.renderList(data, now)}
        </div>
    }
}
