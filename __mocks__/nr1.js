const React = require('react');

// Enum stubs: return strings for anything accessed. Cached per key so identity
// stays stable across renders and equality checks don't allocate proxies.
const enumStub = (root) => {
  const cache = {};
  return new Proxy(
    {},
    {
      get: (_t, prop) => {
        if (typeof prop === 'symbol') return undefined;
        if (prop === 'then' || prop === 'toJSON') return undefined;
        if (!(prop in cache)) cache[prop] = `${root}.${prop}`;
        return cache[prop];
      },
    }
  );
};

const attachEnums = (Comp, keys) => {
  keys.forEach((k) => {
    Comp[k] = enumStub(`${Comp.displayName || 'X'}.${k}`);
  });
  return Comp;
};

// --- Components ---
const Button = ({
  children,
  onClick,
  ariaLabel,
  disabled,
  className,
  ...rest
}) =>
  React.createElement(
    'button',
    {
      type: 'button',
      'data-testid': 'nr1-Button',
      'aria-label': ariaLabel,
      className,
      disabled,
      onClick,
    },
    children
  );
Button.displayName = 'Button';
attachEnums(Button, ['VARIANT', 'TYPE', 'SIZE_TYPE', 'ICON_TYPE']);

const Icon = ({ className, type }) =>
  React.createElement('span', {
    'data-testid': 'nr1-Icon',
    'data-icon-type': typeof type === 'string' ? type : undefined,
    className,
  });
Icon.displayName = 'Icon';
attachEnums(Icon, ['TYPE', 'ALIGN_TYPE']);

const EmptyState = ({ title, description, action }) =>
  React.createElement(
    'div',
    { 'data-testid': 'nr1-EmptyState' },
    React.createElement('div', { 'data-testid': 'nr1-EmptyState-title' }, title),
    React.createElement(
      'div',
      { 'data-testid': 'nr1-EmptyState-description' },
      description
    ),
    action &&
      React.createElement(
        'button',
        {
          type: 'button',
          'data-testid': 'nr1-EmptyState-action',
          onClick: action.onClick,
        },
        action.label
      )
  );
EmptyState.displayName = 'EmptyState';
attachEnums(EmptyState, ['TYPE', 'ILLUSTRATION_TYPE']);

const SectionMessage = ({ title, description, actions }) =>
  React.createElement(
    'div',
    { 'data-testid': 'nr1-SectionMessage' },
    React.createElement(
      'div',
      { 'data-testid': 'nr1-SectionMessage-title' },
      title
    ),
    React.createElement(
      'div',
      { 'data-testid': 'nr1-SectionMessage-description' },
      description
    ),
    (actions || []).map((a, i) =>
      React.createElement(
        'button',
        {
          key: i,
          type: 'button',
          'data-testid': `nr1-SectionMessage-action-${i}`,
          onClick: a.onClick,
        },
        a.label
      )
    )
  );
SectionMessage.displayName = 'SectionMessage';
attachEnums(SectionMessage, ['TYPE']);

const InlineMessage = ({ label, type }) =>
  React.createElement(
    'div',
    { 'data-testid': 'nr1-InlineMessage', 'data-type': type },
    label
  );
InlineMessage.displayName = 'InlineMessage';
attachEnums(InlineMessage, ['TYPE']);

const HeadingText = ({ children }) =>
  React.createElement('h2', { 'data-testid': 'nr1-HeadingText' }, children);
HeadingText.displayName = 'HeadingText';
attachEnums(HeadingText, ['TYPE']);

const Spinner = () =>
  React.createElement('div', { 'data-testid': 'nr1-Spinner' });
Spinner.displayName = 'Spinner';
attachEnums(Spinner, ['TYPE']);

const Switch = ({ label, checked, onChange }) =>
  React.createElement(
    'label',
    { 'data-testid': 'nr1-Switch' },
    React.createElement('input', {
      type: 'checkbox',
      'aria-label': label,
      checked: !!checked,
      onChange,
    }),
    label
  );
Switch.displayName = 'Switch';

const Tabs = ({ children, onChange, ariaLabel }) =>
  React.createElement(
    'div',
    { 'data-testid': 'nr1-Tabs', 'aria-label': ariaLabel },
    React.Children.map(children, (child, i) => {
      if (!child) return null;
      const value = child.props?.value ?? `tab-${i}`;
      return React.createElement(
        'div',
        { key: value, 'data-testid': `nr1-Tab-${value}`, onClick: () => onChange?.(value) },
        React.createElement(
          'div',
          { 'data-testid': `nr1-Tab-label-${value}` },
          child.props?.label
        ),
        child.props?.children
      );
    })
  );
Tabs.displayName = 'Tabs';

const TabsItem = ({ children }) =>
  React.createElement('div', { 'data-testid': 'nr1-TabsItem' }, children);
TabsItem.displayName = 'TabsItem';

const DataTable = ({ items = [], children, selection, onSelectionChange }) => {
  const kids = React.Children.toArray(children);
  const body = kids.find((c) => c?.type?.displayName === 'DataTableBody');
  const rowRenderer = body?.props?.children;
  return React.createElement(
    'div',
    { 'data-testid': 'nr1-DataTable', 'data-item-count': items.length },
    items.map((item, i) =>
      React.createElement(
        'div',
        {
          key: item?.guid ?? i,
          'data-testid': `nr1-DataTable-row-${i}`,
          'data-selected': !!selection?.[i],
          onClick: () =>
            onSelectionChange?.({ ...(selection || {}), [i]: !selection?.[i] }),
        },
        typeof rowRenderer === 'function' ? rowRenderer({ item }) : null
      )
    )
  );
};
DataTable.displayName = 'DataTable';
attachEnums(DataTable, ['SELECTION_TYPE']);

const DataTableBody = () =>
  React.createElement('div', { 'data-testid': 'nr1-DataTableBody' });
DataTableBody.displayName = 'DataTableBody';

const DataTableHeader = ({ children }) =>
  React.createElement('div', { 'data-testid': 'nr1-DataTableHeader' }, children);
DataTableHeader.displayName = 'DataTableHeader';

const DataTableHeaderCell = ({ children }) =>
  React.createElement(
    'div',
    { 'data-testid': 'nr1-DataTableHeaderCell' },
    children
  );
DataTableHeaderCell.displayName = 'DataTableHeaderCell';

const DataTableRow = ({ children }) =>
  React.createElement('div', { 'data-testid': 'nr1-DataTableRow' }, children);
DataTableRow.displayName = 'DataTableRow';

const DataTableEntityRowCell = ({ alertSeverity, reporting }) =>
  React.createElement(
    'div',
    {
      'data-testid': 'nr1-DataTableEntityRowCell',
      'data-severity': alertSeverity,
    },
    reporting ? 'reporting' : 'not-reporting'
  );
DataTableEntityRowCell.displayName = 'DataTableEntityRowCell';

const AutoSizer = ({ children }) =>
  React.createElement(
    'div',
    { 'data-testid': 'nr1-AutoSizer' },
    children({ height: 500, width: 500 })
  );
AutoSizer.displayName = 'AutoSizer';

// --- Contexts ---
const PlatformStateContext = React.createContext({});

// --- Hooks (jest.fn stubs; tests override return values) ---
// Stable defaults are important: returning new objects/functions on each call
// would make consumers see new references every render and re-fire effects.
const STABLE_EMPTY_ARR = [];
const STABLE_EMPTY_ENTITIES = { entities: [] };

const _accountsQueryDefault = { data: STABLE_EMPTY_ARR, loading: false };
const useAccountsQuery = jest.fn(() => _accountsQueryDefault);

const _accountStorageQueryDefault = { data: null, loading: false, error: null };
const useAccountStorageQuery = jest.fn(() => _accountStorageQueryDefault);

// Mutation hooks: same mutation function returned each call unless a test
// overrides. Using module-level fns keeps identity stable across renders.
const _docWriteFn = jest.fn(async () => ({}));
const _docDeleteFn = jest.fn(async () => ({}));
const _mutationCallSequence = { count: 0 };
const useAccountStorageMutation = jest.fn(() => {
  // Return one fn per call — the two calls in nexus (docWrite, docDelete)
  // should each get a distinct stable fn.
  _mutationCallSequence.count += 1;
  return [_mutationCallSequence.count % 2 === 1 ? _docWriteFn : _docDeleteFn];
});
useAccountStorageMutation.ACTION_TYPE = {
  WRITE_DOCUMENT: 'WRITE_DOCUMENT',
  DELETE_DOCUMENT: 'DELETE_DOCUMENT',
};

const _userPrefsDefault = { data: null, loading: false, error: null };
const useUserStorageQuery = jest.fn(() => _userPrefsDefault);

const _writePrefsFn = jest.fn(async () => ({}));
const _deletePrefsFn = jest.fn(async () => ({}));
const _userMutationCallSequence = { count: 0 };
const useUserStorageMutation = jest.fn(() => {
  _userMutationCallSequence.count += 1;
  return [
    _userMutationCallSequence.count % 2 === 1 ? _writePrefsFn : _deletePrefsFn,
  ];
});
useUserStorageMutation.ACTION_TYPE = {
  WRITE_DOCUMENT: 'WRITE_DOCUMENT',
  DELETE_DOCUMENT: 'DELETE_DOCUMENT',
};

const _entitiesByGuidsDefault = { data: STABLE_EMPTY_ENTITIES, loading: false };
const useEntitiesByGuidsQuery = jest.fn(() => _entitiesByGuidsDefault);

const _entitySearchDefault = {
  data: { count: 0, entities: STABLE_EMPTY_ARR },
  fetchMore: jest.fn(),
};
const useEntitySearchQuery = jest.fn(() => _entitySearchDefault);

const _nrqlDefault = { data: null, loading: false, error: null };
const useNrqlQuery = jest.fn(() => _nrqlDefault);

// --- Singletons ---
const navigation = {
  openNerdlet: jest.fn(),
  getOpenEntityLocation: jest.fn(() => ({ pathname: '/entity/x', search: '' })),
};

const nerdlet = {
  setConfig: jest.fn(),
  ACCOUNT_PICKER_DEFAULT_VALUES: [],
};

// Reset helper for tests
const __resetMutationCounters = () => {
  _mutationCallSequence.count = 0;
  _userMutationCallSequence.count = 0;
};

module.exports = {
  AutoSizer,
  Button,
  DataTable,
  DataTableBody,
  DataTableEntityRowCell,
  DataTableHeader,
  DataTableHeaderCell,
  DataTableRow,
  EmptyState,
  HeadingText,
  Icon,
  InlineMessage,
  navigation,
  nerdlet,
  PlatformStateContext,
  SectionMessage,
  Spinner,
  Switch,
  Tabs,
  TabsItem,
  useAccountsQuery,
  useAccountStorageMutation,
  useAccountStorageQuery,
  useEntitiesByGuidsQuery,
  useEntitySearchQuery,
  useNrqlQuery,
  useUserStorageMutation,
  useUserStorageQuery,
  __resetMutationCounters,
  __docWriteFn: _docWriteFn,
  __docDeleteFn: _docDeleteFn,
  __writePrefsFn: _writePrefsFn,
  __deletePrefsFn: _deletePrefsFn,
};
