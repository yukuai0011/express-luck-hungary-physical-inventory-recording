import React from 'react';
import renderer from 'react-test-renderer';
import App from './App';

test('renders App without crashing', () => {
  const tree = renderer.create(<App />).toJSON();
  expect(tree).toBeTruthy();
});
