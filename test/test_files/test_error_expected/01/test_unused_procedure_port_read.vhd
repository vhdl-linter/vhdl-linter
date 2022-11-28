library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;
package test_unused_procedure_port_read is

end package;
package body test_unused_procedure_port_read is

  procedure test (foo : in boolean) is
  begin

  end procedure;
end package body;
