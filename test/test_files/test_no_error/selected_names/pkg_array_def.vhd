
package pkg_array_def is
  type test is record
    element: integer;
  end record;

  type test_array is array (natural range <>) of test;
end package;