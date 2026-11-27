import test from "node:test";
import assert from "node:assert/strict";
import { isWithinMetroManila } from "../../resources/js/utils/metroManilaCoverage.js";

// Small sample polygon in GeoJSON longitude/latitude order.
const metroSample = [
    [[
        [120.9, 14.4],
        [121.1, 14.4],
        [121.1, 14.7],
        [120.9, 14.7],
        [120.9, 14.4],
    ]],
];

test("a valid geocoded pin inside the covered area can be confirmed", () => {
    assert.equal(isWithinMetroManila(14.5176, 121.0509, metroSample), true);
    assert.equal(isWithinMetroManila("14.5176", "121.0509", metroSample), true);
});

test("an address outside the mapped delivery boundary is rejected", () => {
    assert.equal(isWithinMetroManila(14.83, 121.05, metroSample), false);
    assert.equal(isWithinMetroManila(14.58, 121.17, metroSample), false);
});

test("an unset, missing or unusable pin cannot enable checkout", () => {
    for (const coords of [["", ""], [null, null], [undefined, undefined], ["not-a-lat", 121]]) {
        assert.equal(isWithinMetroManila(coords[0], coords[1], metroSample), false);
    }
    assert.equal(isWithinMetroManila(14.5, 121, []), false);
});

test("polygon holes and multiple regions are respected", () => {
    const withHole = [
        metroSample[0].concat([[
            [121.01, 14.49], [121.03, 14.49],
            [121.03, 14.51], [121.01, 14.51],
            [121.01, 14.49],
        ]]),
        [[[122.0, 14.0], [122.1, 14.0], [122.1, 14.1], [122.0, 14.1], [122.0, 14.0]]],
    ];
    assert.equal(isWithinMetroManila(14.5, 121.02, withHole), false);
    assert.equal(isWithinMetroManila(14.5, 121.05, withHole), true);
    assert.equal(isWithinMetroManila(14.05, 122.05, withHole), true);
});
