export default function SyncLoaderDirective() {
  return {
    restrict: "E",
    replace: true,
    scope: {},
    template: `
        <div class="sync-loader">
          <div class="mask"></div>
          <div class="sync-loader-item">
            <img id="sync-loader-img" style="display:block;position:absolute;top:10px;left:10px" width="50px" height="50px" class="sync-loader-img" src='/public/images/loader.gif' />
          </div>
        </div>
      `,
    link: function($scope,$element,$attr) {
      // console.log($scope,$element,$attr)
    }
  }
}
