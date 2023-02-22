

entity generic_instantiation is

end generic_instantiation;

architecture arch of generic_instantiation is
begin
  inst_generic_entity : entity work.generic_entity
    generic map (
      GENERIC_NAME => 5
      );


end architecture;
