-- vhdl-linter-disable port-declaration
library ieee;
use ieee.std_logic_1164.std_ulogic_vector;
entity test_not_all is
  port (
    test : in std_ulogic -- is not used
    );
end test_not_all;
