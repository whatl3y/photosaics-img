export default function LoaderDirective() {
  return {
    restrict: "E",
    replace: true,
    scope: {
      normal: '='
    },
    template: `
        <img src='/public/images/loader.gif' style='max-height:100%' data-ng-class='(!normal) ? "img-responsive" : ""' />
      `,
    link: function($scope,$element,$attr) {
      // console.log($scope,$element,$attr)
    }
  }
}
