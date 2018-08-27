const LimitedQueue = require('./limited_q')
const LRU = require('./LRU')
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

class Player {
    constructor(socket) {
        this.socket = socket
        this.name = 'untitled'
        this.events = new LRU(6)
        this.cycle = new Cycle()
        this.pilot = new Pilot()
    }

    broadcast(eventKey, payload) {
        this.socket.broadcast.emit(eventKey, payload)
    }

    send(eventKey, payload) {
        this.socket.emit(eventKey, payload)
    }
}


class Game {

    constructor(maxSlots) {
        this.maxSlots = maxSlots
        this.players = new LimitedQueue(this.maxSlots)
        this.map = new hexes.HexMap(255, (q, r, s) => {return new Hex(q, r, s)})
        this.playerId = 100

        this.eventMap = {
            'Identity': (player, event) => {
                // now we add the player since they have given a name
                player.name = event.payload.name
                player.socket.join('game-grid', () => {
                    this.players.add(player)
                    this.broadcast('Text', `${player.name} has joined!`)
                })
            },
            'Ready': (player, event) => {
                let wasReady = player.ready
                player.ready = event.payload.ready
                if (!wasReady && player.ready) {
                    this.broadcast('Text', `${player.name} is ready!`)
                }
            },
            'Start': (player, event) => {
                // the server sends a Start never receives
            },

            'Accelerate': (player, event) => {},
            'Rotate': (player, event) => {},
            'Eject': (player, event) => {},

            // These are also outbound events
            'Hex': (player, event) => {},
            'Text': (player, event) => {},
            'Spawn': (player, event) => {},
        }

    }

    processEvents() {
        if (this.players.size) {
            this.players.visit((player) => {
                const event = player.events.dequeue()
                const eventHandler = this.eventMap[event.t]
                eventHandler(player, event)
            })
        }
    }

    start(io) {
        io.on("connection", socket => {
            if (this.players.available() > 0) {
                let player = new Player(socket)
                player.id = this.playerId++
                this.player.state = 'connecting'
                socket.onmessage = (event) => {
                    this.player.state = 'connected'
                    if (event.priority > 0) {
                        this.players.events.insert(event, 0)
                    } else {
                        this.players.events.add(event)
                    }
                }

                socket.on("error", (error) => {
                    // if (this.player.state !== 'connected') {
                    //
                    // }
                })

                socket.on("disconnecting", (reason) => {
                    this.player.state = 'dropping'
                })

                socket.on("disconnect", (reason) => {
                    this.player.state = 'dropped'
                    this.players.remove(player)
                })
            } else {
                socket.disconnect()
            }
        })
        this.eventTimer = setInterval(() => this.processEvents(), 50)
    }

    stop() {
        clearInterval(this.eventTimer)
        this.eventTimer = null
        this.players.visit((player) => player.socket.disconnect())
        process.exitCode = 1
    }
}

module.exports = {Game, Cycle, Hex, Pilot, Player, Rectifier, Sprite, Wall}
