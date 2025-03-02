import * as React from 'react';
import { Paths } from '../../config';
import { Link } from 'react-router-dom';
import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';
import { FilterSelected } from '../Filters/StatefulFilters';
import { dicIstioType } from '../../types/IstioConfigList';

interface BreadCumbViewProps {
  location: {
    pathname: string;
    search: string;
  };
}

interface BreadCumbViewState {
  namespace: string;
  cluster?: string;
  itemName: string;
  item: string;
  pathItem: string;
  istioType?: string;
}

const ItemNames = {
  applications: 'App',
  services: 'Service',
  workloads: 'Workload',
  istio: 'Istio Object'
};

const IstioName = 'Istio Config';
const namespaceRegex = /namespaces\/([a-z0-9-]+)\/([\w-.]+)\/([\w-.*]+)(\/([\w-.]+))?(\/([\w-.]+))?/;

export class BreadcrumbView extends React.Component<BreadCumbViewProps, BreadCumbViewState> {
  static capitalize = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  static istioType(rawType: string) {
    const istioType = Object.keys(dicIstioType).find(key => dicIstioType[key] === rawType);
    return istioType ? istioType : this.capitalize(rawType);
  }

  constructor(props: BreadCumbViewProps) {
    super(props);
    this.state = this.updateItem();
  }

  updateItem = () => {
    let regex = namespaceRegex;
    let extension = false;
    const match = this.props.location.pathname.match(regex) || [];
    const ns = match[1];
    const page = Paths[match[2].toUpperCase()];
    const istioType = match[3];
    const urlParams = new URLSearchParams(this.props.location.search);
    let itemName = page !== 'istio' ? match[3] : match[5];
    return {
      namespace: ns,
      cluster: urlParams.get('cluster') || undefined,
      pathItem: page,
      item: itemName,
      itemName: ItemNames[page],
      istioType: istioType,
      extension: extension
    };
  };

  componentDidUpdate(
    prevProps: Readonly<BreadCumbViewProps>,
    _prevState: Readonly<BreadCumbViewState>,
    _snapshot?: any
  ): void {
    if (prevProps.location !== this.props.location) {
      this.setState(this.updateItem());
    }
  }

  cleanFilters = () => {
    FilterSelected.resetFilters();
  };

  isIstio = () => {
    return this.state.pathItem === 'istio';
  };

  getItemPage = () => {
    let path = `/namespaces/${this.state.namespace}/${this.state.pathItem}/${this.state.item}`;
    if (this.state.cluster) {
      path += `?cluster=${this.state.cluster}`;
    }
    return path;
  };

  render() {
    const { namespace, item, istioType, pathItem } = this.state;
    const isIstio = this.isIstio();
    const linkItem = isIstio ? (
      <BreadcrumbItem isActive={true}>{item}</BreadcrumbItem>
    ) : (
      <BreadcrumbItem isActive={true}>
        <Link to={this.getItemPage()} onClick={this.cleanFilters}>
          {item}
        </Link>
      </BreadcrumbItem>
    );
    return (
      <Breadcrumb>
        <BreadcrumbItem>
          <Link to={`/${pathItem}`} onClick={this.cleanFilters}>
            {isIstio ? IstioName : BreadcrumbView.capitalize(pathItem)}
          </Link>
        </BreadcrumbItem>
        <BreadcrumbItem>
          <Link to={`/${pathItem}?namespaces=${namespace}`} onClick={this.cleanFilters}>
            Namespace: {namespace}
          </Link>
        </BreadcrumbItem>
        {isIstio && (
          <BreadcrumbItem>
            <Link
              to={`/${pathItem}?namespaces=${namespace}&istiotype=${dicIstioType[this.state.istioType || '']}`}
              onClick={this.cleanFilters}
            >
              {istioType ? BreadcrumbView.istioType(istioType) : istioType}
            </Link>
          </BreadcrumbItem>
        )}
        {linkItem}
      </Breadcrumb>
    );
  }
}

export default BreadcrumbView;
