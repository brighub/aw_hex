const hexes = require('./hexes')

class Sprite {
    constructor() {
        this.x = null
        this.y = null
        this.face = null
        this.speed = 0.0
        this.energy = 1.0
        this.hitpoints = 1.0
        this.alive = false
    }
}

class Cycle extends Sprite {
}

class Pilot extends Sprite {
}

class Rectifier extends Sprite {
}

class Wall extends Sprite {
    constructor(owner, fromEdge, toEdge) {
        super()
        this.owner = owner
        this.fromEdge = fromEdge
        this.toEdge = toEdge
    }
}

class Hex extends hexes.Hex {
    constructor(q, r, s) {
        super(q, r, s)
        this.owner = 0
        this.walls = []
        this.players = []
        this.items = []
    }
}

class Queue {
    constructor({name, limit, purge}) {
        this.q = []
        this.name = name
        this.limit = limit
        this.purge = purge
    }

    empty() {
        return this.q.length === 0
    }

    available() {
        return this.limit ? this.q.length < this.limit : true
    }

    visit(fn) {
        this.q.forEach(fn)
    }

    dequeue() {
        // index 0 = front of list!
        if (this.q.length) {
            return this.q.shift()
        }
        return undefined
    }

    remove(item) {
        for (let k = 0; k < this.q.length; k++) {
            if (this.q[item] === item) {
                this.q.splice(k, 1)
                return;
            }
        }
    }

    enqueue(item) {
        if (this.limit && this.q.length >= this.limit) {
            if (this.purge) {
                while (this.q.length >= this.limit) this.q.pop()
            } else {
                return undefined
            }
        }

        this.q.push(item)
        return item
    }
}

class Player {
    constructor(socket, id) {
        this.socket = socket
        this.id = id
        this.events = new Queue({name: `Q-unit-${id}`, limit: 6, purge: true})
        this.state = 'creating'
        this.socket.join('game-grid', () => { console.log(`${this.name} has joined the game-grid`)})
        this.name = 'unit-' + id
        this.state = 'connected'
        this.cycle = new Cycle()
        this.pilot = new Pilot()
        this.sprite = this.cycle
    }

}


class Game {

    constructor(io) {
        this.io = io
        this.maxSlots = 6
        this.players = new Queue({name: 'playerList', limit: this.maxSlots})
        this.map = new hexes.HexMap(255, (q, r, s) => {return new Hex(q, r, s)})
        this.playerId = 100

        this.eventMap = {
            Accelerate: (player, event) => {
                player.sprite.speed += (0.05 * event.delta)
                if (player.sprite.speed > 0.99) player.sprite.speed = 0.99
                if (player.sprite.speed < 0.01) player.sprite.speed = 0.01
            },
            Rotate: (player, event) => {
                player.sprite.face += (60 * event.delta)
                if (player.sprite.face > 360) player.sprite.face -= 360
                if (player.sprite.face < 0) player.sprite.face += 360
            },
            Eject: (player, event) => {
                if (player.sprite === player.cycle) {
                    player.sprite = player.pilot
                    player.cycle.dismounted = true
                }
            },
            Hex: (player, event) => {},
            Text: (player, event) => {
                this.io.in('game-grid').emit('Text', event)
            },
            Spawn: (player, event) => {},
        }

    }

    processEvents() {
        const startTime = new Date()

        this.players.visit((player) => {
            const execute = player.events.dequeue()
            if (execute !== undefined) {
                execute()
            }
        })

        // try to maintain 20fps
        const elapsed = new Date() - startTime
        const sleep = elapsed > 50 ? 50 - (elapsed % 50) : 50 - elapsed
        this.eventTimer = setTimeout(this.processEvents, sleep)
    }

    messageReceiver(key, event, player) {
        const eventHandler = this.eventMap[key]
        if (eventHandler.priority === 'now') {
            eventHandler(player, event)
        } else {
            player.events.enqueue(() => eventHandler(player, event))
        }
    }

    attach(socket, player) {
        socket.on("error", (error) => {
        })

        socket.on("disconnecting", (reason) => {
            player.state = 'dropping'
        })

        socket.on("disconnect", (reason) => {
            player.state = 'dropped'
            this.players.remove(player)
        })

        for (const property in this.eventMap) {
            if (this.eventMap.hasOwnProperty(property)) {
                const key = property
                socket.on(key, (event) => {
                    this.messageReceiver(key, event, player)
                })
            }
        }
    }

    start() {
        this.io.on("connection", socket => {
            if (this.players.available()) {
                let player = new Player(socket, this.playerId += 37)
                this.players.enqueue(player)
                this.attach(socket, player)
                socket.broadcast.emit('Text', {f: 'MCP', m: `${player.name} has joined!`})
            } else {
                socket.disconnect()
            }
        })
        this.processEvents = this.processEvents.bind(this)
        this.eventTimer = setTimeout(this.processEvents, 50)
    }

    stop() {
        if (this.eventTimer) clearTimeout(this.eventTimer)
        this.eventTimer = null
        this.players.visit((player) => player.socket.disconnect())
        process.exitCode = 1
    }
}

module.exports = {Game, Cycle, Hex, Pilot, Player, Rectifier, Sprite, Wall}
