library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

package pkg is
  type rec is record
    field: integer;
  end record;

  alias a is rec;

end package;