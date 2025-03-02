import * as React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { Provider } from 'react-redux';
import { shallowToJson } from 'enzyme-to-json';
import { mount, shallow, ReactWrapper } from 'enzyme';
import { OverviewPage } from '../OverviewPage';
import OverviewPageContainer from '../OverviewPage';
import { FilterSelected } from '../../../components/Filters/StatefulFilters';
import * as API from '../../../services/Api';
import { AppHealth, NamespaceAppHealth, HEALTHY, FAILURE, DEGRADED } from '../../../types/Health';
import { store } from '../../../store/ConfigStore';
import { MTLSStatuses } from '../../../types/TLSStatus';
import { FilterType, ActiveFiltersInfo } from 'types/Filters';
import { healthFilter } from 'components/Filters/CommonFilters';
import { nameFilter } from '../Filters';
import { DEFAULT_LABEL_OPERATION } from '../../../types/Filters';

const mockAPIToPromise = (func: keyof typeof API, obj: any, encapsData: boolean): Promise<void> => {
  return new Promise((resolve, reject) => {
    jest.spyOn(API, func).mockImplementation(() => {
      return new Promise(r => {
        if (encapsData) {
          r({ data: obj });
        } else {
          r(obj);
        }
        setTimeout(() => {
          try {
            resolve();
          } catch (e) {
            reject(e);
          }
        }, 2);
      });
    });
  });
};

const mockNamespaces = (names: string[]): Promise<void> => {
  return mockAPIToPromise(
    'getNamespaces',
    names.map(n => ({ name: n })),
    true
  );
};

const mockNamespaceHealth = (obj: NamespaceAppHealth): Promise<void> => {
  return mockAPIToPromise('getNamespaceAppHealth', obj, false);
};

let mounted: ReactWrapper<any, any> | null;

const mountPage = () => {
  mounted = mount(
    <Provider store={store}>
      <Router>
        <OverviewPageContainer />
      </Router>
    </Provider>
  );
};

const genActiveFilters = (filter: FilterType, values: string[]): ActiveFiltersInfo => {
  return {
    filters: values.map(v => {
      return {
        category: filter.category,
        value: v
      };
    }),
    op: 'or'
  };
};

const concat = (f1: ActiveFiltersInfo, f2: ActiveFiltersInfo): ActiveFiltersInfo => {
  return {
    filters: f1.filters.concat(f2.filters),
    op: f1.op
  };
};

describe('Overview page', () => {
  beforeEach(() => {
    mounted = null;

    // Ignore other calls
    mockAPIToPromise('getNamespaceMetrics', null, false);
    mockAPIToPromise('getNamespaceTls', null, false);
    mockAPIToPromise('getConfigValidations', null, false);
    mockAPIToPromise('getAllIstioConfigs', null, false);
    mockAPIToPromise('getIstioPermissions', {}, false);
  });

  afterEach(() => {
    jest.clearAllMocks();

    if (mounted) {
      mounted.unmount();
    }
  });

  it('renders initial layout', () => {
    const wrapper = shallow(
      <OverviewPage
        meshStatus={MTLSStatuses.NOT_ENABLED}
        navCollapse={false}
        duration={600}
        refreshInterval={10000}
        kiosk={''}
        minTLS={''}
        istioAPIEnabled={false}
        isMaistra={false}
      />
    );
    expect(shallowToJson(wrapper)).toMatchSnapshot();
  });

  it('renders all without filters', done => {
    FilterSelected.setSelected({ filters: [], op: DEFAULT_LABEL_OPERATION });
    Promise.all([
      mockNamespaces(['a', 'b', 'c']),
      mockNamespaceHealth({
        app1: {
          getGlobalStatus: () => HEALTHY
        } as AppHealth,
        app2: {
          getGlobalStatus: () => FAILURE
        } as AppHealth
      })
    ]).then(() => {
      mounted!.update();
      // All 3 namespaces rendered
      expect(mounted!.find('Card')).toHaveLength(3);
      done();
    });
    mountPage();
  });

  it('filters failures match', done => {
    FilterSelected.setSelected(genActiveFilters(healthFilter, ['Failure']));
    Promise.all([
      mockNamespaces(['a']),
      mockNamespaceHealth({
        app1: {
          getGlobalStatus: () => DEGRADED
        } as AppHealth,
        app2: {
          getGlobalStatus: () => FAILURE
        } as AppHealth,
        app3: {
          getGlobalStatus: () => HEALTHY
        } as AppHealth
      })
    ]).then(() => {
      mounted!.update();
      expect(mounted!.find('Card')).toHaveLength(1);
      done();
    });
    mountPage();
  });

  it('filters failures no match', done => {
    FilterSelected.setSelected(genActiveFilters(healthFilter, ['Failure']));
    Promise.all([
      mockNamespaces(['a']),
      mockNamespaceHealth({
        app1: {
          getGlobalStatus: () => DEGRADED
        } as AppHealth,
        app2: {
          getGlobalStatus: () => HEALTHY
        } as AppHealth,
        app3: {
          getGlobalStatus: () => HEALTHY
        } as AppHealth
      })
    ]).then(() => {
      mounted!.update();
      expect(mounted!.find('Card')).toHaveLength(0);
      done();
    });
    mountPage();
  });

  it('multi-filters health match', done => {
    FilterSelected.setSelected(genActiveFilters(healthFilter, ['Failure', 'Degraded']));
    Promise.all([
      mockNamespaces(['a']),
      mockNamespaceHealth({
        app1: {
          getGlobalStatus: () => DEGRADED
        } as AppHealth,
        app2: {
          getGlobalStatus: () => HEALTHY
        } as AppHealth
      })
    ]).then(() => {
      mounted!.update();
      expect(mounted!.find('Card')).toHaveLength(1);
      done();
    });
    mountPage();
  });

  it('multi-filters health no match', done => {
    FilterSelected.setSelected(genActiveFilters(healthFilter, ['Failure', 'Degraded']));
    Promise.all([
      mockNamespaces(['a']),
      mockNamespaceHealth({
        app1: {
          getGlobalStatus: () => HEALTHY
        } as AppHealth,
        app2: {
          getGlobalStatus: () => HEALTHY
        } as AppHealth
      })
    ]).then(() => {
      mounted!.update();
      expect(mounted!.find('Card')).toHaveLength(0);
      done();
    });
    mountPage();
  });

  it('filters namespaces info name match', done => {
    FilterSelected.setSelected(genActiveFilters(nameFilter, ['bc']));
    Promise.all([
      mockNamespaces(['abc', 'bce', 'ced']),
      mockNamespaceHealth({
        app1: {
          getGlobalStatus: () => HEALTHY
        } as AppHealth
      })
    ]).then(() => {
      mounted!.update();
      expect(mounted!.find('Card')).toHaveLength(2);
      done();
    });
    mountPage();
  });

  it('filters namespaces info name no match', done => {
    FilterSelected.setSelected(genActiveFilters(nameFilter, ['yz']));
    mockNamespaces(['abc', 'bce', 'ced']).then(() => {
      mounted!.update();
      expect(mounted!.find('Card')).toHaveLength(0);
      done();
    });
    mountPage();
  });

  it('filters namespaces info name and health match', done => {
    FilterSelected.setSelected(
      concat(genActiveFilters(nameFilter, ['bc']), genActiveFilters(healthFilter, ['Healthy']))
    );
    Promise.all([
      mockNamespaces(['abc', 'bce', 'ced']),
      mockNamespaceHealth({
        app1: {
          getGlobalStatus: () => HEALTHY
        } as AppHealth
      })
    ]).then(() => {
      mounted!.update();
      expect(mounted!.find('Card')).toHaveLength(2);
      done();
    });
    mountPage();
  });

  it('filters namespaces info name and health no match', done => {
    FilterSelected.setSelected(
      concat(genActiveFilters(nameFilter, ['bc']), genActiveFilters(healthFilter, ['Healthy']))
    );
    Promise.all([
      mockNamespaces(['abc', 'bce', 'ced']),
      mockNamespaceHealth({
        app1: {
          getGlobalStatus: () => DEGRADED
        } as AppHealth
      })
    ]).then(() => {
      mounted!.update();
      expect(mounted!.find('Card')).toHaveLength(0);
      done();
    });
    mountPage();
  });
});
