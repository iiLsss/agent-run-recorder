export default {
  extends: ["stylelint-config-standard"],
  ignoreFiles: ["dist/**/*"],
  rules: {
    "custom-property-empty-line-before": null,
    "selector-class-pattern": [
      "^[a-z][a-zA-Z0-9]*$",
      {
        message: "Use camelCase class names in CSS Modules"
      }
    ],
    "custom-property-pattern": null
  }
};
