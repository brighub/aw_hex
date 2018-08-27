class Point {
    constructor(x, y) {
        this.x = x
        this.y = y
    }
}

exports.Point = Point

class Hex {
    constructor(q, r, s) {
        this.q = q
        this.r = r
        this.s = s
        if (Math.round(q + r + s) !== 0)
            throw "q + r + s must be 0"
    }

    add(b) {
        return new Hex(this.q + b.q, this.r + b.r, this.s + b.s)
    }

    subtract(b) {
        return new Hex(this.q - b.q, this.r - b.r, this.s - b.s)
    }

    scale(k) {
        return new Hex(this.q * k, this.r * k, this.s * k)
    }

    rotateLeft() {
        return new Hex(-this.s, -this.q, -this.r)
    }

    rotateRight() {
        return new Hex(-this.r, -this.s, -this.q)
    }

    static direction(direction) {
        return Hex.directions[direction]
    }

    neighbor(direction) {
        return this.add(Hex.direction(direction))
    }

    diagonalNeighbor(direction) {
        return this.add(Hex.diagonals[direction])
    }

    len() {
        return (Math.abs(this.q) + Math.abs(this.r) + Math.abs(this.s)) / 2
    }

    distance(b) {
        return this.subtract(b).len()
    }

    round() {
        var qi = Math.round(this.q)
        var ri = Math.round(this.r)
        var si = Math.round(this.s)
        var q_diff = Math.abs(qi - this.q)
        var r_diff = Math.abs(ri - this.r)
        var s_diff = Math.abs(si - this.s)
        if (q_diff > r_diff && q_diff > s_diff) {
            qi = -ri - si
        }
        else if (r_diff > s_diff) {
            ri = -qi - si
        }
        else {
            si = -qi - ri
        }
        return new Hex(qi, ri, si)
    }

    lerp(b, t) {
        return new Hex(this.q * (1 - t) + b.q * t, this.r * (1 - t) + b.r * t, this.s * (1 - t) + b.s * t)
    }

    linedraw(b) {
        var N = this.distance(b)
        var a_nudge = new Hex(this.q + 0.000001, this.r + 0.000001, this.s - 0.000002)
        var b_nudge = new Hex(b.q + 0.000001, b.r + 0.000001, b.s - 0.000002)
        var results = []
        var step = 1.0 / Math.max(N, 1)
        for (var i = 0; i <= N; i++) {
            results.push(a_nudge.lerp(b_nudge, step * i).round())
        }
        return results
    }

    key() {
        return (this.q << 24 & this.r << 16 & this.s)
    }

    cube_to_axial(cube) {
        var q = cube.x
        var r = cube.z
        return new Hex(q, r)
    }

    axial_to_cube(hex) {
        var x = hex.q
        var z = hex.r
        var y = -x - z
        return Cube(x, y, z)
    }

    static hex_add(a,b) {
        return new Hex(a.q + b.q, a.r + b.r, a.s + b.s);
    }

    static hex_subtract(a, b) {
        return new Hex(a.q - b.q, a.r - b.r, a.s - b.s);
    }

    static hex_multiply(a, k) {
        return new Hex(a.q * k, a.r * k, a.s * k);
    }

}

Hex.directions = [new Hex(1, 0, -1), new Hex(1, -1, 0), new Hex(0, -1, 1), new Hex(-1, 0, 1), new Hex(-1, 1, 0), new Hex(0, 1, -1)]
Hex.diagonals = [new Hex(2, -1, -1), new Hex(1, -2, 1), new Hex(-1, -1, 2), new Hex(-2, 1, 1), new Hex(-1, 2, -1), new Hex(1, 1, -2)]
exports.Hex = Hex


class Orientation {
    constructor(f0, f1, f2, f3, b0, b1, b2, b3, start_angle) {
        this.f0 = f0
        this.f1 = f1
        this.f2 = f2
        this.f3 = f3
        this.b0 = b0
        this.b1 = b1
        this.b2 = b2
        this.b3 = b3
        this.start_angle = start_angle
    }
}

exports.Orientation = Orientation

class Layout {
    constructor(orientation, size, origin) {
        this.orientation = orientation
        this.size = size
        this.origin = origin
    }

    hexToPixel(h) {
        var M = this.orientation
        var size = this.size
        var origin = this.origin
        var x = (M.f0 * h.q + M.f1 * h.r) * size.x
        var y = (M.f2 * h.q + M.f3 * h.r) * size.y
        return new Point(x + origin.x, y + origin.y)
    }

    pixelToHex(p) {
        var M = this.orientation
        var size = this.size
        var origin = this.origin
        var pt = new Point((p.x - origin.x) / size.x, (p.y - origin.y) / size.y)
        var q = M.b0 * pt.x + M.b1 * pt.y
        var r = M.b2 * pt.x + M.b3 * pt.y
        return new Hex(q, r, -q - r)
    }

    hexCornerOffset(corner) {
        var M = this.orientation
        var size = this.size
        var angle = 2.0 * Math.PI * (M.start_angle - corner) / 6
        return new Point(size.x * Math.cos(angle), size.y * Math.sin(angle))
    }

    polygonCorners(h) {
        var corners = [];
        var center = this.hexToPixel(h);
        for (var i = 0; i < 6; i++) {
            var offset = this.hexCornerOffset(i);
            corners.push(new Point(center.x + offset.x, center.y + offset.y));
        }
        return corners;
    }

}

Layout.pointy = new Orientation(Math.sqrt(3.0), Math.sqrt(3.0) / 2.0, 0.0, 3.0 / 2.0, Math.sqrt(3.0) / 3.0, -1.0 / 3.0, 0.0, 2.0 / 3.0, 0.5)
Layout.flat = new Orientation(3.0 / 2.0, 0.0, Math.sqrt(3.0) / 2.0, Math.sqrt(3.0), 2.0 / 3.0, 0.0, -1.0 / 3.0, Math.sqrt(3.0) / 3.0, 0.0)
exports.Layout = Layout


class HexMap {
    constructor(radius, hexFactory) {
        this.layout = Layout.pointy
        this.radius = radius
        this.map = {}
        this.hexFactory = hexFactory
        this.reset()
    }

    reset() {
        // creates a hex shaped map of hexes
        for (let q = -this.radius; q <= this.radius; q++) {
            let r1 = Math.max(-this.radius, -q - this.radius)
            let r2 = Math.min(this.radius, -q + this.radius)
            for (let r = r1; r <= r2; r++) {
                const hex = this.hexFactory(q, r, -q-r);
                this.map[hex.key()] = hex;
            }
        }
    }
}

exports.HexMap = HexMap
