"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalysisTimeInterval = void 0;
var AnalysisTimeInterval;
(function (AnalysisTimeInterval) {
    function isInterval(obj) {
        return typeof obj === "object"
            && obj !== null
            && typeof obj.start === "number"
            && typeof obj.duration === "number"
            && typeof obj.confidence === "number";
    }
    AnalysisTimeInterval.isInterval = isInterval;
})(AnalysisTimeInterval = exports.AnalysisTimeInterval || (exports.AnalysisTimeInterval = {}));
