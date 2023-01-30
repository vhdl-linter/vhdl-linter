package test_selected_name_alias_pkg is
  alias foo is ieee.std_logic_1164.std_ulogic_vector(2 downto 0);
  procedure test_procedure(constant foo : in integer)
  is
  begin
    report integer'image(foo);
  end procedure;
end package;
