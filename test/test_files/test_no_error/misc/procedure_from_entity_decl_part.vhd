
library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;
entity procedure_from_entity_decl_part is

    procedure test_procedure is
    begin
    end procedure;
end procedure_from_entity_decl_part;

architecture rtl of procedure_from_entity_decl_part is
begin
  test_procedure; -- Shall find procedure from declarative part
end architecture;
