library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

package pkg_record_child_multi is
  type t_testData is record
    element, this_also_exists: integer;
  end record t_testData;

  constant x: t_testData;
  constant y: integer := x.this_also_exists;
end package;