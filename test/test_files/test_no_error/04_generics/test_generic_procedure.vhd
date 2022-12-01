
library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;
entity test_generic_procedure is
  generic (
    procedure test_procedure
    );
  port(
    );

end test_generic_procedure;

architecture rtl of test_generic_procedure is
begin
  test_procedure;
end architecture;
