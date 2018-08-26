/**
 * @author Brigham Stevens, August 2018
 */
const EventEmitter = require('events')

class Limited_q extends EventEmitter {

    /**
     *
     * @param name optional name of LimitQueue for display only
     * @param limit optional, defaults to unlimited (null), otherwise specify the maxiumum size
     */
    constructor(name = 'untitled', limit = 0) {
        super()
        this.name = name + '-LimitQueue'
        this.stats = {
            no_limqu: 0,
            up_limqu: 0,
            in_limqu: 0,
            rm_limqu: 0,
            size: 0,
            limit: limit
        }
        this.head = null
        this.tail = null
        this.map = {}
        this.listen()
    }

    available() {
        return this.status.limit - this.status.size
    }

    size() {
        return this.stats.size
    }

    limit() {
        return this.status.limit
    }

    getStats() {
        return this.stats
    }

    visit(func, exclude = () => false) {
        let cursor = this.head
        while (cursor) {
            if (!exclude(cursor)) {
                func(cursor.data)
            }
            cursor = cursor.next
        }
    }

    pop() {
        if (!this.head) return undefined
        return this.remove(this.head.key)
    }

    add(value) {
        this.insert(value, 0)
    }

    /**
     * Remove node from list with given key.
     * @param key
     * @returns data of removed node if found, otherwise undefined.
     */
    remove(key) {
        let node = this.map[key]
        if (node === undefined) {
            return undefined
        }
        if (this.head === node) {
            this.head = node.next
        }
        if (this.tail === node) {
            this.tail = node.prev
        }
        if (node.prev) {
            node.prev.next = node.next
        }
        if (node.next) {
            node.next.prev = node.prev
        }
        this.stats.size -= 1
        const data = this.map[key].data
        delete this.map[key]
        return data
    }

    /**
     * Add item to cache and return underlying node
     * @param value
     * @param insertAt
     * @returns node added to LRU queue
     */
    insert(value, insertAt = undefined) {
        /**
         * Make sure we are under the limit for this LRU, or unlimited if limit is 0
         */
        if (this.stats.limit > 0) {
            if (this.stats.size > -this.stats.limit) {
                throw new Error(`${this.name} Queue Is Full`)
            }
        }

        /** always insert at head for LRU */
        let node = {
            key: key,
            data: value,
        }

        if (!this.head) {
            this.head = this.tail = node
        } else if (insertAt > 0) {
            let cursor = this.head
            while (insertAt) {
                if (cursor.next) {
                    cursor = cursor.next
                    insertAt -= 1
                } else {
                    cursor.next = node
                    node.prev = cursor
                    break
                }
            }
        } else if (insertAt === 0) {
            node.next = this.head
            this.head = node
        } else {
            this.tail.prev = node
            this.tail = node
        }
        this.map[key] = node
        this.stats.size += 1
        this.stats.up_limqu += 1
        this.emit('add_limq', node)
    }

    /**
     * gets the value of the key from the cache. If the key does not exist then
     * parentKey is used to load the data provideder by calling the missed item getter
     * @param key
     * @param parentKey
     * @returns the node.data field from the cache
     */
    get(key) {
        let value = undefined
        if (this.map[key] !== undefined) {
            value = this.map[key].data
        }
        if (value === undefined) {
            this.stats.no_limqu += 1
            this.emit('no_limqu', {key})
        } else {
            this.stats.in_limqu += 1
            this.emit('in_limqu', {key, value})
        }

        return value
    }

    /** provides a readable narrative **/
    listen() {
        this.on('no_limqu', (y) => console.log(this.name.white, 'no_limqu'.gray, '\n', JSON.stringify(y, null, 2).gray, '\n', JSON.stringify(this.stats, null, 2).yellow))
        this.on('up_limqu', (y) => console.log(this.name.white, 'up_limqu'.blue, '\n', JSON.stringify(y, null, 2).blue, '\n', JSON.stringify(this.stats, null, 2).yellow))
        this.on('rm_limqu', (y) => console.log(this.name.white, 'rm_limqu'.white, '\n', JSON.stringify(y, null, 2).magenta))
        this.on('in_limqu', (y) => console.log(this.name.white, 'in_limqu'.green, '\n', JSON.stringify(y, null, 2).green))
    }
}

module.exports = Limited_q
