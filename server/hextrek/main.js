const LimitedQueue = require('./limited_q')
const LRU = require('./LRU')

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

class Hex {
    constructor() {
        this.owner = 0
        this.walls = []
        this.players = []
        this.objects = []
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
}


// const _packetExamples = ['Identity', name: 'unknown'},
//     'Identity', name:'untitled'},
//     'Ready'},
//     'Start'},
//     'Accelerate', delta: 1},
//     'Rotate', arc: 1},
//     'Eject', priority: 100},
//     'Hex', ownerId: 0, energy: 0.0, walls: [{ownerId: 0, in: 1, out: 2, energy: 100}]},
//     'Text', ownerId: 0, body: ''},
//     'Spawn', isAi: true, entity: '_Rektifryer'}
// ]


// latest:


// class MCP {
//
//     update(map) {
//         // a few seconds after people join MCP sends out chat taunts
//         taunt(map)
//         reclaim(map)
//
//     }
// }

class Game {

    constructor([maxSlots]) {
        this.players = new LimitedQueue(this.maxSlots)
        this.readyCount = 0
        this.map = new HexMap({radius: 5})
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

    broadcast(eventKey, payload) {
        socket.to('others').emit(eventKey, payload)
    }

    processEvents() {
        if (this.players.size) {
            this.players.visit((player) => {
                const event = player.events.dequeue()
                const eventHandler = eventMap[event.t]
            })
        }
    }

    attachListeners() {
        io.on("connection", socket => {
            if (this.players.available() > 0) {
                let player = new Player(socket)
                socket.onmessage = (event) => {
                    if (event.priority > 0) {
                        this.players.events.add(event, 0)
                    } else {
                        this.players.events.add(event)
                    }
                }

                socket.on("disconnect", () => {
                    this.players.remove(player)
                })
            } else {
                socket.disconnect()
            }
        })
    }

    send(message, exclude = []) {
        // players.visit((player, () => {ret}) => {
        //
        // } )
    }

}

module.exports = new Game()