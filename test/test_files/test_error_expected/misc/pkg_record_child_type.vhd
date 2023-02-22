library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

package pkg_record_child_type is
  type t_testData is record
    element: this_type_does_not_exist;
  end record t_testData;
end package;