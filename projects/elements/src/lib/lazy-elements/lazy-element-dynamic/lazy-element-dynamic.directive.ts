import {
  Directive,
  Input,
  OnInit,
  TemplateRef,
  ViewContainerRef,
  ComponentFactoryResolver,
  ChangeDetectorRef
} from '@angular/core';

import {
  LazyElementsLoaderService,
  ElementConfig
} from '../lazy-elements-loader.service';

const LOG_PREFIX = '@angular-extensions/elements';

@Directive({
  selector: '[axLazyElementDynamic]'
})
export class LazyElementDynamicDirective implements OnInit {
  @Input('axLazyElementDynamic') tag: string;
  @Input('axLazyElementDynamicUrl') url: string; // tslint:disable-line:no-input-rename
  @Input('axLazyElementDynamicLoadingTemplate') loadingTemplateRef: TemplateRef<
    any
  >; // tslint:disable-line:no-input-rename
  @Input('axLazyElementDynamicErrorTemplate') errorTemplateRef: TemplateRef<
    any
  >; // tslint:disable-line:no-input-rename
  @Input('axLazyElementDynamicModule') isModule: boolean | undefined; // tslint:disable-line:no-input-rename

  constructor(
    private vcr: ViewContainerRef,
    private template: TemplateRef<any>,
    private elementsLoaderService: LazyElementsLoaderService,
    private cfr: ComponentFactoryResolver,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    if (!this.tag || this.tag.length === 0 || !this.tag.includes('-')) {
      throw new Error(
        `${LOG_PREFIX} - Valid tag has to be specified when using *axLazyElementDynamic directive (use *axLazyElementDynamic="'some-tag'"), got: "${this.tag}"`
      );
    }

    const elementConfig =
      this.elementsLoaderService.getElementConfig(this.tag) ||
      ({} as ElementConfig);
    const options = this.elementsLoaderService.options;
    const loadingComponent =
      elementConfig.loadingComponent || options.loadingComponent;

    if (this.loadingTemplateRef) {
      this.vcr.createEmbeddedView(this.loadingTemplateRef);
    } else if (loadingComponent) {
      const factory = this.cfr.resolveComponentFactory(loadingComponent);
      this.vcr.createComponent(factory);
    }

    this.elementsLoaderService
      .loadElement(this.url, this.tag, this.isModule)
      .then(() => {
        if ((this.template as any)._declarationTContainer) {
          // (this.template as any)._declarationTContainer.tagName = this.tag;
          throw new Error(
            'The *axLazyElementDynamic directive is currently does NOT support Angular Ivy, please use standard *axLazyElement directive instead!'
          );
        } else {
          (this
            .template as any)._def.element.template.nodes[0].element.name = this.tag;
        }
        this.vcr.clear();
        this.vcr.createEmbeddedView(this.template);
        this.cdr.markForCheck();
      })
      .catch(error => {
        const errorComponent =
          elementConfig.errorComponent || options.errorComponent;
        this.vcr.clear();
        if (this.errorTemplateRef) {
          this.vcr.createEmbeddedView(this.errorTemplateRef);
          this.cdr.markForCheck();
        } else if (errorComponent) {
          const factory = this.cfr.resolveComponentFactory(errorComponent);
          this.vcr.createComponent(factory);
          this.cdr.markForCheck();
        } else {
          console.error(
            `${LOG_PREFIX} - Loading of element <${this.tag}> failed, please provide <ng-template #error>Loading failed...</ng-template> and reference it in *axLazyElementDynamic="errorTemplate: error" to display customized error message in place of element\n\n`,
            error
          );
        }
      });
  }
}
