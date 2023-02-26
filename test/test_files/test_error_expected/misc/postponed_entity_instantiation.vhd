entity foo is
end entity;

entity postponed_entity_instantiation is
end entity;
architecture arch of postponed_entity_instantiation is
begin
  label_inst : postponed entity work.foo; -- this shall not be postponed
end architecture;
