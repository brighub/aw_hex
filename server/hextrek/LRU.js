/**
 * @author Brigham Stevens, August 2018
 */
const EventEmitter = require('events');

class LRU extends EventEmitter {

    /**
     *
     * @param name optional name of LRU for display only
     * @param limit optional, defaults to unlimited (null), otherwise specify the maximum number of items to cache
     */
    constructor(name = 'untitled', limit = 0) {
        super();
        this.name = name + '-LRU';
        this.stats = {
            no_cache: 0,
            up_cache: 0,
            in_cache: 0,
            rm_cache: 0,
            size: 0,
            limit: limit
        };
        this.head = null;
        this.tail = null;
        this.map = {};
        this.listen();
    }

    getStats() {
        return this.stats;
    }

    /**
     * Remove node from list with given key.
     * @param key
     * @returns data of removed node if found, otherwise undefined.
     */
    remove(key) {
        let node = this.map[key];
        if (node === undefined) {
            return undefined;
        }
        if (this.head === node) {
            this.head = node.next;
        }
        if (this.tail === node) {
            this.tail = node.prev;
        }
        if (node.prev) {
            node.prev.next = node.next;
        }
        if (node.next) {
            node.next.prev = node.prev;
        }
        this.stats.size -= 1;
        const data = this.map[key].data;
        delete this.map[key];
        return data;
    }

    /**
     * Add item to cache and return underlying node
     * @param key
     * @param value
     * @returns node added to LRU queue
     */
    set(key, value) {
        /**
         * Make sure we are under the limit for this LRU, or unlimited if limit is 0
         */
        if (this.stats.limit > 0) {
            while (this.stats.size >= this.stats.limit) {
                let purged = this.remove(this.tail.key);
                this.stats.rm_cache += 1;
                this.emit('rm_cache', {purged});
            }
        }

        /** always insert at head for LRU */
        let node = {
            key: key,
            data: value,
            next: this.head,
        };

        if (!this.head) {
            this.head = this.tail = node;
        } else {
            this.head.prev = node;
            this.head = node;
        }
        this.map[key] = node;
        this.stats.size += 1;
        this.stats.up_cache += 1;
        this.emit('up_cache', {key, value});
    }

    /**
     * gets the value of the key from the cache. If the key does not exist then
     * parentKey is used to load the data provideder by calling the missed item getter
     * @param key
     * @param parentKey
     * @returns the node.data field from the cache
     */
    get(key) {
        // if key exists get the value and remove it from the queue
        let value = undefined;
        if (this.map[key] !== undefined) {
            value = this.map[key].data;
            this.remove(key);
        }
        if (value === undefined) {
            this.stats.no_cache += 1;
            this.emit('no_cache', {key});
        } else {
            this.set(key, value);
            this.stats.in_cache += 1;
            this.emit('in_cache', {key, value})
        }

        return value;
    }

    // /** provides a readable narrative **/
    // listen() {
    //     this.on('no_cache', (y) => console.log(this.name.white, 'no_cache'.gray, '\n', JSON.stringify(y, null, 2).gray, '\n', JSON.stringify(this.stats, null, 2).yellow));
    //     this.on('up_cache', (y) => console.log(this.name.white, 'up_cache'.blue, '\n', JSON.stringify(y, null, 2).blue, '\n', JSON.stringify(this.stats, null, 2).yellow));
    //     this.on('rm_cache', (y) => console.log(this.name.white, 'rm_cache'.white, '\n', JSON.stringify(y, null, 2).magenta));
    //     this.on('in_cache', (y) => console.log(this.name.white, 'in_cache'.green, '\n', JSON.stringify(y, null, 2).green));
    // }
}

module.exports = LRU;
